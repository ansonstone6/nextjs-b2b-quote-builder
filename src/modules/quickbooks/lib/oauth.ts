import { getQboConfig } from "@/modules/quickbooks/lib/config";
import { saveConnection } from "@/modules/quickbooks/lib/connection-store";

/**
 * Build Intuit OAuth 2.0 authorize URL.
 * @see https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
 */
export function buildAuthorizeUrl(state: string) {
  const cfg = getQboConfig();
  if (!cfg.configured) {
    throw new Error(cfg.validation.errors.join("; ") || "QuickBooks OAuth is not configured");
  }

  const params = new URLSearchParams();
  params.set("client_id", cfg.clientId);
  params.set("redirect_uri", cfg.redirectUri);
  params.set("response_type", "code");
  params.set("scope", cfg.scopes);
  params.set("state", state);

  return `${cfg.authBase}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type: string;
};

async function exchangeToken(body: Record<string, string>) {
  const cfg = getQboConfig();
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = (await res.json()) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    throw new Error(
      json.error_description ?? json.error ?? `Token exchange failed (${res.status})`,
    );
  }
  return json;
}

export async function exchangeAuthorizationCode(
  code: string,
  realmId: string,
  demoSessionId?: string | null,
) {
  const cfg = getQboConfig();
  const tokens = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
  });
  const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const refreshTokenExpiresAt = tokens.x_refresh_token_expires_in
    ? new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000)
    : undefined;

  const connection = await saveConnection({
    realmId,
    demoSessionId: demoSessionId ?? null,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  });

  return { connection, tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  const tokens = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    refreshTokenExpiresAt: tokens.x_refresh_token_expires_in
      ? new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000)
      : undefined,
  };
}
