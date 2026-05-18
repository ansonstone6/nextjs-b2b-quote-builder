import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/modules/quickbooks/lib/crypto";
import { getQboConfig } from "@/modules/quickbooks/lib/config";

/**
 * Resolve the QuickBooks connection for a given demo session.
 *
 * Demo-session isolation: every visitor browser carries a `qbo_demo_session` cookie
 * (see `demo-session.ts`). Their connect flow stamps that id onto the saved connection
 * row, so subsequent sync calls only see their own QBO sandbox - even when many
 * visitors connect simultaneously.
 *
 * If `demoSessionId` is null/undefined we fall back to the most-recent connection
 * without a session id. That preserves the original single-tenant local-dev UX
 * (no breaking change for your `.env.local` workflow).
 */
export async function getActiveQuickBooksConnection(demoSessionId?: string | null) {
  if (demoSessionId) {
    const scoped = await prisma.integrationConnection.findFirst({
      where: { provider: "quickbooks", demoSessionId },
      orderBy: { connectedAt: "desc" },
    });
    if (scoped) return scoped;
    return null;
  }
  return prisma.integrationConnection.findFirst({
    where: { provider: "quickbooks", demoSessionId: null },
    orderBy: { connectedAt: "desc" },
  });
}

export async function getDecryptedTokens(connection: IntegrationConnection) {
  const { encryptionKey } = getQboConfig();
  if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return {
    accessToken: decryptToken(connection.accessTokenEncrypted, encryptionKey),
    refreshToken: decryptToken(connection.refreshTokenEncrypted, encryptionKey),
  };
}

export async function saveConnection(input: {
  realmId: string;
  demoSessionId?: string | null;
  companyName?: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt?: Date;
}) {
  const { encryptionKey } = getQboConfig();
  if (!encryptionKey) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");

  const data = {
    provider: "quickbooks" as const,
    realmId: input.realmId,
    demoSessionId: input.demoSessionId ?? null,
    companyName: input.companyName ?? null,
    accessTokenEncrypted: encryptToken(input.accessToken, encryptionKey),
    refreshTokenEncrypted: encryptToken(input.refreshToken, encryptionKey),
    accessTokenExpiresAt: input.accessTokenExpiresAt,
    refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
  };

  // We can't use `upsert` against a multi-column unique that includes a nullable
  // column (Postgres treats NULL as distinct, so a null-session "match" might still
  // create duplicates). Look it up explicitly and update or insert.
  const existing = await prisma.integrationConnection.findFirst({
    where: {
      provider: "quickbooks",
      realmId: input.realmId,
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
