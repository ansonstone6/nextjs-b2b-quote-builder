import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/modules/quickbooks/lib/crypto";
import { getQboConfig } from "@/modules/quickbooks/lib/config";

export async function getActiveQuickBooksConnection() {
  return prisma.integrationConnection.findFirst({
    where: { provider: "quickbooks" },
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
    companyName: input.companyName ?? null,
    accessTokenEncrypted: encryptToken(input.accessToken, encryptionKey),
    refreshTokenEncrypted: encryptToken(input.refreshToken, encryptionKey),
    accessTokenExpiresAt: input.accessTokenExpiresAt,
    refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
  };

  return prisma.integrationConnection.upsert({
    where: {
      provider_realmId: { provider: "quickbooks", realmId: input.realmId },
    },
    create: data,
    update: data,
  });
}
