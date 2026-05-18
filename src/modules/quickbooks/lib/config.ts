export type QboEnvironment = "sandbox" | "production";

const PLACEHOLDER_CLIENT_IDS = new Set([
  "your_intuit_client_id",
  "your_client_id",
  "changeme",
]);

function trimEnv(value: string | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

export type QboConfigValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export function validateQboConfig(): QboConfigValidation {
  const clientId = trimEnv(process.env.QBO_CLIENT_ID);
  const clientSecret = trimEnv(process.env.QBO_CLIENT_SECRET);
  const redirectUri = trimEnv(process.env.QBO_REDIRECT_URI);
  const encryptionKey = trimEnv(process.env.TOKEN_ENCRYPTION_KEY);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!clientId) {
    errors.push("QBO_CLIENT_ID is missing in .env.local");
  } else if (PLACEHOLDER_CLIENT_IDS.has(clientId.toLowerCase())) {
    errors.push("QBO_CLIENT_ID is still the placeholder - paste your Intuit Development Client ID");
  } else if (clientId.length < 20) {
    errors.push("QBO_CLIENT_ID looks too short - use the Client ID from Intuit Developer -> Keys & OAuth");
  }

  if (!clientSecret) {
    errors.push("QBO_CLIENT_SECRET is missing");
  } else if (clientSecret.length < 10) {
    errors.push("QBO_CLIENT_SECRET looks invalid");
  }

  if (!redirectUri) {
    errors.push("QBO_REDIRECT_URI is missing");
  } else {
    try {
      const u = new URL(redirectUri);
      if (u.pathname !== "/api/quickbooks/auth/callback") {
        warnings.push(
          `Redirect path is ${u.pathname} - expected /api/quickbooks/auth/callback (must match Intuit app settings exactly)`,
        );
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        errors.push("QBO_REDIRECT_URI must be http or https");
      }
    } catch {
      errors.push("QBO_REDIRECT_URI is not a valid URL");
    }
  }

  if (!encryptionKey) {
    errors.push("TOKEN_ENCRYPTION_KEY is missing");
  } else if (encryptionKey.length < 32) {
    errors.push("TOKEN_ENCRYPTION_KEY should be at least 32 characters");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function getQboConfig() {
  const clientId = trimEnv(process.env.QBO_CLIENT_ID);
  const clientSecret = trimEnv(process.env.QBO_CLIENT_SECRET);
  const redirectUri = trimEnv(process.env.QBO_REDIRECT_URI);
  const environment = (trimEnv(process.env.QBO_ENVIRONMENT) || "sandbox") as QboEnvironment;
  const encryptionKey = trimEnv(process.env.TOKEN_ENCRYPTION_KEY);
  const validation = validateQboConfig();
  const configured = validation.ok;

  const authBase = "https://appcenter.intuit.com/connect/oauth2";
  const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
  const apiBase =
    environment === "production"
      ? "https://quickbooks.api.intuit.com"
      : "https://sandbox-quickbooks.api.intuit.com";

  return {
    configured,
    validation,
    clientId,
    clientSecret,
    redirectUri,
    environment,
    encryptionKey,
    authBase,
    tokenUrl,
    apiBase,
    /**
     * Intuit OAuth scopes. We only request `com.intuit.quickbooks.accounting` - that's all
     * the invoice sync needs. Requesting `openid profile email` here would require the app
     * to have "Sign in with Intuit" enabled, otherwise Intuit redirects to /oauth2/error.
     */
    scopes: "com.intuit.quickbooks.accounting",
    clientIdHint: clientId ? `${clientId.slice(0, 6)}…` : null,
  };
}

export function invoiceUrl(realmId: string, invoiceId: string, env: QboEnvironment) {
  const host =
    env === "production"
      ? "https://app.qbo.intuit.com"
      : "https://app.sandbox.qbo.intuit.com";
  return `${host}/app/invoice?txnId=${invoiceId}`;
}
