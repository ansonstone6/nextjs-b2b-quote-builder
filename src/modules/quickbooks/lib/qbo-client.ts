import type { IntegrationConnection } from "@prisma/client";
import { getQboConfig } from "@/modules/quickbooks/lib/config";
import {
  getDecryptedTokens,
  saveConnection,
} from "@/modules/quickbooks/lib/connection-store";
import { refreshAccessToken } from "@/modules/quickbooks/lib/oauth";

type QboCustomer = { Id: string; DisplayName: string; PrimaryEmailAddr?: { Address: string } };
type QboInvoice = { Id: string; DocNumber?: string; TotalAmt?: number };

export async function ensureFreshAccessToken(connection: IntegrationConnection) {
  const bufferMs = 60_000;
  if (connection.accessTokenExpiresAt.getTime() > Date.now() + bufferMs) {
    const tokens = await getDecryptedTokens(connection);
    return { accessToken: tokens.accessToken, connection, refreshed: false };
  }
  const { refreshToken } = await getDecryptedTokens(connection);
  const refreshed = await refreshAccessToken(refreshToken);
  const updated = await saveConnection({
    realmId: connection.realmId,
    companyName: connection.companyName ?? undefined,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
    refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
  });
  return { accessToken: refreshed.accessToken, connection: updated, refreshed: true };
}

async function qboFetch<T>(
  connection: IntegrationConnection,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cfg = getQboConfig();
  const { accessToken, connection: fresh } = await ensureFreshAccessToken(connection);
  const url = `${cfg.apiBase}/v3/company/${fresh.realmId}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

export async function findCustomerByEmail(
  connection: IntegrationConnection,
  email: string,
) {
  const safeEmail = email.replace(/'/g, "\\'");
  const q = encodeURIComponent(`select * from Customer where PrimaryEmailAddr = '${safeEmail}'`);
  const data = await qboFetch<{ QueryResponse?: { Customer?: QboCustomer[] } }>(
    connection,
    `/query?query=${q}`,
  );
  const list = data.QueryResponse?.Customer ?? [];
  return list[0] ?? null;
}

export async function createCustomer(
  connection: IntegrationConnection,
  input: {
    displayName: string;
    email: string;
    billingLine1?: string | null;
    billingCity?: string | null;
    billingState?: string | null;
    billingPostal?: string | null;
    billingCountry?: string | null;
  },
) {
  const body = {
    DisplayName: input.displayName,
    PrimaryEmailAddr: { Address: input.email },
    BillAddr: {
      Line1: input.billingLine1 ?? undefined,
      City: input.billingCity ?? undefined,
      CountrySubDivisionCode: input.billingState ?? undefined,
      PostalCode: input.billingPostal ?? undefined,
      Country: input.billingCountry ?? "US",
    },
  };
  const data = await qboFetch<{ Customer: QboCustomer }>(connection, "/customer", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.Customer;
}

export async function createInvoice(
  connection: IntegrationConnection,
  input: {
    customerId: string;
    docNumber: string;
    lines: { description: string; quantity: number; unitPrice: number }[];
    taxAmount: number;
  },
) {
  const lineItems = input.lines.map((line, i) => ({
    LineNum: i + 1,
    Amount: Math.round(line.quantity * line.unitPrice * 100) / 100,
    DetailType: "SalesItemLineDetail",
    Description: line.description,
    SalesItemLineDetail: {
      Qty: line.quantity,
      UnitPrice: line.unitPrice,
    },
  }));

  if (input.taxAmount > 0) {
    lineItems.push({
      LineNum: lineItems.length + 1,
      Amount: input.taxAmount,
      DetailType: "SalesItemLineDetail",
      Description: "Tax",
      SalesItemLineDetail: { Qty: 1, UnitPrice: input.taxAmount },
    });
  }

  const body = {
    DocNumber: input.docNumber,
    CustomerRef: { value: input.customerId },
    Line: lineItems,
  };

  const data = await qboFetch<{ Invoice: QboInvoice }>(connection, "/invoice", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.Invoice;
}
