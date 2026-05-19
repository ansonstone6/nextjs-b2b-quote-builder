import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/modules/quickbooks/lib/crypto";
import { getMondayConfig } from "./config";

const NEVER_EXPIRES = new Date("2100-01-01T00:00:00Z");
const PLACEHOLDER_REFRESH = "monday-personal-token-no-refresh";

/**
 * Resolve the Monday connection for a given demo session (same pattern as the
 * QuickBooks module). See `qbo` connection-store for the rationale.
 */
export async function getActiveMondayConnection(demoSessionId?: string | null) {
  if (demoSessionId) {
    return prisma.integrationConnection.findFirst({
      where: { provider: "monday", demoSessionId },
      orderBy: { connectedAt: "desc" },
    });
  }
  return prisma.integrationConnection.findFirst({
    where: { provider: "monday", demoSessionId: null },
    orderBy: { connectedAt: "desc" },
  });
}

export async function getDecryptedMondayToken(connection: IntegrationConnection): Promise<string> {
  const { encryptionKey } = getMondayConfig();
  if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return decryptToken(connection.accessTokenEncrypted, encryptionKey);
}

export async function saveMondayConnection(input: {
  accountId: string;
  accountName?: string | null;
  accountSlug?: string | null;
  demoSessionId?: string | null;
  apiToken: string;
}) {
  const { encryptionKey } = getMondayConfig();
  if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");

  const data = {
    provider: "monday" as const,
    realmId: input.accountId,
    companyName: input.accountName ?? null,
    accountSlug: input.accountSlug ?? null,
    demoSessionId: input.demoSessionId ?? null,
    accessTokenEncrypted: encryptToken(input.apiToken, encryptionKey),
    refreshTokenEncrypted: encryptToken(PLACEHOLDER_REFRESH, encryptionKey),
    accessTokenExpiresAt: NEVER_EXPIRES,
  };

  // Match the QBO no-upsert pattern: Postgres NULL semantics on the
  // (provider, realm, session) unique would let duplicates through.
  const existing = await prisma.integrationConnection.findFirst({
    where: {
      provider: "monday",
      realmId: input.accountId,
      demoSessionId: input.demoSessionId ?? null,
    },
  });
  if (existing) {
    return prisma.integrationConnection.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.integrationConnection.create({ data });
}

export async function setDefaultBoardId(connectionId: string, boardId: string | null) {
  return prisma.integrationConnection.update({
    where: { id: connectionId },
    data: { defaultBoardId: boardId },
  });
}

export async function disconnectMonday(connectionId: string) {
  return prisma.integrationConnection.delete({ where: { id: connectionId } });
}
