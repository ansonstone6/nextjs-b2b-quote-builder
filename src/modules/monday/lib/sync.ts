import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderQuotePdf } from "@/lib/pdf/render-quote";
import { boardItemUrl, getMondayConfig } from "./config";
import { getActiveMondayConnection, getDecryptedMondayToken } from "./connection-store";
import {
  addFileToColumn,
  createItem,
  getBoardColumns,
  MondayError,
} from "./monday-client";

function idempotencyKey(orderId: string, connectionId: string) {
  return `monday-item:${connectionId}:${orderId}`;
}

async function appendLog(
  jobId: string,
  step: string,
  message: string,
  level: "info" | "error" = "info",
  payload?: object,
) {
  await prisma.syncLog.create({
    data: { jobId, step, message, level, payload: payload ?? undefined },
  });
}

function num(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v.toString());
}

/**
 * Build the column_values payload for the new Monday item.
 *
 * Monday columns are board-specific (the customer chooses their own column ids),
 * so we use a heuristic: scan the board's columns, pick the first column of each
 * type we care about, and route order data into it. Anything we can't map is
 * skipped silently. A future iteration can replace this with an admin-driven
 * column mapping table — see /admin for the catalog precedent.
 */
function pickColumnId(
  columns: Array<{ id: string; title: string; type: string }>,
  type: string,
  titleHint?: RegExp,
): string | undefined {
  if (titleHint) {
    const byTitle = columns.find((c) => c.type === type && titleHint.test(c.title));
    if (byTitle) return byTitle.id;
  }
  return columns.find((c) => c.type === type)?.id;
}

export async function getOrderSyncState(orderId: string, connectionId?: string | null) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  const ref = await prisma.externalReference.findFirst({
    where: {
      quoteId: order.quoteId,
      provider: "monday",
      entityType: "board_item",
      ...(connectionId ? { connectionId } : {}),
    },
  });
  const latestJob = await prisma.syncJob.findFirst({
    where: { quoteId: order.quoteId, ...(connectionId ? { connectionId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { logs: { orderBy: { createdAt: "asc" }, take: 30 } },
  });
  return { ref, latestJob };
}

export async function syncOrderToMonday(
  orderId: string,
  options?: { retryJobId?: string; demoSessionId?: string | null },
) {
  const cfg = getMondayConfig();
  if (!cfg.configured) {
    throw new Error("Monday is not configured. Set TOKEN_ENCRYPTION_KEY in .env.local");
  }

  const connection = await getActiveMondayConnection(options?.demoSessionId ?? null);
  if (!connection) {
    throw new Error("Monday is not connected. Open Monday → Connect first.");
  }
  if (!connection.defaultBoardId) {
    throw new Error("No default board selected. Pick one on /monday/connect first.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      quote: {
        include: {
          client: true,
          items: {
            include: { product: true, material: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      client: true,
    },
  });
  if (!order) throw new Error("Order not found");

  const quote = order.quote;
  const boardId = connection.defaultBoardId;

  // --- Idempotency: same connection + same order = at most one item.
  const existingRef = await prisma.externalReference.findFirst({
    where: {
      quoteId: quote.id,
      provider: "monday",
      entityType: "board_item",
      connectionId: connection.id,
    },
  });
  if (existingRef) {
    return {
      alreadySynced: true,
      itemId: existingRef.externalId,
      itemUrl: existingRef.externalUrl,
      order,
    };
  }

  const key = idempotencyKey(order.id, connection.id);
  let job =
    options?.retryJobId
      ? await prisma.syncJob.findUniqueOrThrow({ where: { id: options.retryJobId } })
      : await prisma.syncJob.findUnique({ where: { idempotencyKey: key } });
  if (!job) {
    job = await prisma.syncJob.create({
      data: {
        quoteId: quote.id,
        connectionId: connection.id,
        idempotencyKey: key,
        status: "pending",
      },
    });
  } else if (job.status === "success") {
    // Job claimed success but no ref — fall through and re-create.
  }

  await prisma.syncJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      startedAt: new Date(),
      lastError: null,
      retryCount: options?.retryJobId ? { increment: 1 } : undefined,
    },
  });

  try {
    const token = await getDecryptedMondayToken(connection);

    // --- Columns: look up the board's columns once so we can route data.
    await appendLog(job.id, "board_columns_fetched", `Fetching columns for board ${boardId}`);
    const columns = await getBoardColumns(token, boardId);

    const clientColId = pickColumnId(columns, "text", /(client|customer|company)/i);
    const statusColId = pickColumnId(columns, "status", /(status|stage)/i);
    const numbersColId = pickColumnId(columns, "numbers", /(total|amount|price)/i);
    const dateColId = pickColumnId(columns, "date", /(due|deliver|ship)/i);
    const filesColId = pickColumnId(columns, "file", /(quote|pdf|attach|file)/i);

    const columnValues: Record<string, unknown> = {};
    if (clientColId) columnValues[clientColId] = quote.client.companyName;
    if (statusColId) {
      columnValues[statusColId] =
        order.status === OrderStatus.fulfilled
          ? { label: "Done" }
          : order.status === OrderStatus.cancelled
            ? { label: "Stuck" }
            : { label: "Working on it" };
    }
    if (numbersColId) columnValues[numbersColId] = num(quote.grandTotal);
    if (dateColId) {
      // 14 days out is a reasonable default production lead time for custom framing.
      const due = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      columnValues[dateColId] = { date: due.toISOString().slice(0, 10) };
    }

    const itemName = `${quote.quoteNumber} — ${quote.client.companyName}`;
    await appendLog(job.id, "item_create_requested", `Creating Monday item on board ${boardId}`, "info", {
      itemName,
      mappedColumns: Object.keys(columnValues),
    });
    const item = await createItem(token, { boardId, itemName, columnValues });
    const itemUrl = boardItemUrl(boardId, item.id, connection.accountSlug);

    await prisma.externalReference.create({
      data: {
        quoteId: quote.id,
        connectionId: connection.id,
        provider: "monday",
        entityType: "board_item",
        externalId: item.id,
        externalUrl: itemUrl,
        // Prisma's InputJsonValue is recursive; columnValues is a plain JSON-safe
        // object built above, so the cast is safe.
        metadata: { boardId, columnValues } as Parameters<
          typeof prisma.externalReference.create
        >[0]["data"]["metadata"],
      },
    });
    await appendLog(job.id, "item_created", `Item ${item.id} created`, "info", {
      itemId: item.id,
      url: itemUrl,
    });

    // --- File attachment (best-effort, doesn't fail the sync if no Files col).
    if (filesColId) {
      try {
        const pdf = await renderQuotePdf(quote.id);
        if (pdf) {
          await appendLog(
            job.id,
            "file_upload_requested",
            `Uploading ${pdf.filename} to column ${filesColId}`,
          );
          const uploaded = await addFileToColumn(token, {
            itemId: item.id,
            columnId: filesColId,
            filename: pdf.filename,
            bytes: pdf.bytes,
            mimeType: pdf.mimeType,
          });
          await appendLog(
            job.id,
            "file_uploaded",
            uploaded ? `PDF attached as asset ${uploaded.id}` : "PDF upload returned no asset id",
            "info",
            { assetId: uploaded?.id },
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "PDF upload failed";
        await appendLog(job.id, "file_upload_failed", msg, "error");
        // Continue — item creation already succeeded.
      }
    } else {
      await appendLog(
        job.id,
        "file_upload_skipped",
        "Board has no Files column; skipping PDF attachment",
      );
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "success", completedAt: new Date(), lastError: null },
    });

    const isRetry = (options?.retryJobId ?? false) && job.retryCount > 0;
    if (isRetry) {
      await appendLog(job.id, "retry_succeeded", "Sync retry completed successfully");
    }

    return {
      alreadySynced: false,
      itemId: item.id,
      itemUrl,
      jobId: job.id,
      order,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    const payload = e instanceof MondayError && e.errors ? { errors: e.errors } : undefined;
    await appendLog(job.id, "sync_failed", message, "error", payload);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date(), lastError: message },
    });
    throw e;
  }
}
