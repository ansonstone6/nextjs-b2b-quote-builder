import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getQboConfig, invoiceUrl } from "@/modules/quickbooks/lib/config";
import { getActiveQuickBooksConnection } from "@/modules/quickbooks/lib/connection-store";
import {
  createCustomer,
  createInvoice,
  ensureFreshAccessToken,
  findCustomerByEmail,
} from "@/modules/quickbooks/lib/qbo-client";

function idempotencyKey(quoteId: string) {
  return `quickbooks-invoice:${quoteId}`;
}

function num(v: { toString(): string } | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v.toString());
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

export async function getQuoteSyncState(quoteId: string) {
  const invoiceRef = await prisma.externalReference.findUnique({
    where: {
      quoteId_provider_entityType: {
        quoteId,
        provider: "quickbooks",
        entityType: "invoice",
      },
    },
  });
  const customerRef = await prisma.externalReference.findUnique({
    where: {
      quoteId_provider_entityType: {
        quoteId,
        provider: "quickbooks",
        entityType: "customer",
      },
    },
  });
  const latestJob = await prisma.syncJob.findFirst({
    where: { quoteId },
    orderBy: { createdAt: "desc" },
    include: { logs: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  return { invoiceRef, customerRef, latestJob };
}

export async function syncQuoteToQuickBooks(quoteId: string, options?: { retryJobId?: string }) {
  const cfg = getQboConfig();
  if (!cfg.configured) {
    throw new Error("QuickBooks is not configured. Set QBO_* and TOKEN_ENCRYPTION_KEY in .env.local");
  }

  const connection = await getActiveQuickBooksConnection();
  if (!connection) {
    throw new Error("QuickBooks is not connected. Open QuickBooks → Connect first.");
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      client: true,
      items: { include: { product: true, material: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== QuoteStatus.approved && quote.status !== QuoteStatus.synced) {
    throw new Error("Only approved quotes can be synced to QuickBooks");
  }

  const existingInvoice = await prisma.externalReference.findUnique({
    where: {
      quoteId_provider_entityType: {
        quoteId,
        provider: "quickbooks",
        entityType: "invoice",
      },
    },
  });
  if (existingInvoice) {
    return {
      alreadySynced: true,
      invoiceId: existingInvoice.externalId,
      invoiceUrl: existingInvoice.externalUrl,
      quote,
    };
  }

  const key = idempotencyKey(quoteId);
  let job =
    options?.retryJobId
      ? await prisma.syncJob.findUniqueOrThrow({ where: { id: options.retryJobId } })
      : await prisma.syncJob.findUnique({ where: { idempotencyKey: key } });

  if (!job) {
    job = await prisma.syncJob.create({
      data: {
        quoteId,
        connectionId: connection.id,
        idempotencyKey: key,
        status: "pending",
      },
    });
  } else if (job.status === "success") {
    const ref = await prisma.externalReference.findUnique({
      where: {
        quoteId_provider_entityType: {
          quoteId,
          provider: "quickbooks",
          entityType: "invoice",
        },
      },
    });
    if (ref) {
      return {
        alreadySynced: true,
        invoiceId: ref.externalId,
        invoiceUrl: ref.externalUrl,
        quote,
        jobId: job.id,
      };
    }
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
    const tokenResult = await ensureFreshAccessToken(connection);
    if (tokenResult.refreshed) {
      await appendLog(job.id, "token_refreshed", "QuickBooks access token refreshed");
    }

    let customerId: string;
    const existingCustomerRef = await prisma.externalReference.findUnique({
      where: {
        quoteId_provider_entityType: {
          quoteId,
          provider: "quickbooks",
          entityType: "customer",
        },
      },
    });

    if (existingCustomerRef) {
      customerId = existingCustomerRef.externalId;
      await appendLog(job.id, "customer_found", "Using stored QuickBooks customer reference", "info", {
        customerId,
      });
    } else {
      await appendLog(job.id, "customer_searched", `Searching customer by email ${quote.client.email}`);
      const found = await findCustomerByEmail(tokenResult.connection, quote.client.email);
      if (found) {
        customerId = found.Id;
        await appendLog(job.id, "customer_found", `Matched QuickBooks customer ${found.DisplayName}`, "info", {
          customerId,
        });
      } else {
        await appendLog(job.id, "customer_created", `Creating QuickBooks customer for ${quote.client.companyName}`);
        const created = await createCustomer(tokenResult.connection, {
          displayName: quote.client.companyName,
          email: quote.client.email,
          billingLine1: quote.client.billingLine1,
          billingCity: quote.client.billingCity,
          billingState: quote.client.billingState,
          billingPostal: quote.client.billingPostal,
          billingCountry: quote.client.billingCountry,
        });
        customerId = created.Id;
        await appendLog(job.id, "customer_created", `Created QuickBooks customer ${created.DisplayName}`, "info", {
          customerId,
        });
      }
      await prisma.externalReference.upsert({
        where: {
          quoteId_provider_entityType: {
            quoteId,
            provider: "quickbooks",
            entityType: "customer",
          },
        },
        create: {
          quoteId,
          provider: "quickbooks",
          entityType: "customer",
          externalId: customerId,
        },
        update: { externalId: customerId },
      });
    }

    const lines = quote.items.map((item) => {
      const qty = item.quantity;
      const total = num(item.lineTotal);
      const unitPrice = qty > 0 ? Math.round((total / qty) * 100) / 100 : total;
      const desc =
        item.label ??
        `${item.product.name} — ${item.material.name} (${item.width}×${item.height} ${item.product.dimensionUnitLabel})`;
      return { description: desc, quantity: qty, unitPrice };
    });

    await appendLog(job.id, "invoice_created", `Creating QuickBooks invoice ${quote.quoteNumber}`);
    const invoice = await createInvoice(tokenResult.connection, {
      customerId,
      docNumber: quote.quoteNumber,
      lines,
      taxAmount: num(quote.taxAmount),
    });

    const url = invoiceUrl(tokenResult.connection.realmId, invoice.Id, cfg.environment);
    await prisma.externalReference.create({
      data: {
        quoteId,
        provider: "quickbooks",
        entityType: "invoice",
        externalId: invoice.Id,
        externalUrl: url,
        metadata: { docNumber: invoice.DocNumber, totalAmt: invoice.TotalAmt },
      },
    });

    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: QuoteStatus.synced },
    });

    await prisma.quoteStatusHistory.create({
      data: {
        quoteId,
        fromStatus: quote.status,
        toStatus: QuoteStatus.synced,
        note: `Synced to QuickBooks invoice ${invoice.Id}`,
      },
    });

    await appendLog(job.id, "invoice_created", `Invoice created in QuickBooks (${invoice.Id})`, "info", {
      invoiceId: invoice.Id,
      url,
    });

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
      invoiceId: invoice.Id,
      invoiceUrl: url,
      jobId: job.id,
      quote,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    await appendLog(job.id, "sync_failed", message, "error");
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date(), lastError: message },
    });
    throw e;
  }
}
