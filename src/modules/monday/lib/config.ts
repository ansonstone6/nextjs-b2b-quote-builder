function trimEnv(v: string | undefined): string {
  if (!v) return "";
  const s = v.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

export type MondayConfigValidation = {
  ok: boolean;
  errors: string[];
};

export function validateMondayConfig(): MondayConfigValidation {
  // Monday uses personal API tokens — the only thing the server needs is the
  // shared TOKEN_ENCRYPTION_KEY (same key the QBO module uses to encrypt
  // tokens at rest). Token *value* itself is supplied at runtime by the user
  // via /monday/connect, so we don't read it from env.
  const encryptionKey = trimEnv(process.env.TOKEN_ENCRYPTION_KEY);
  const errors: string[] = [];
  if (!encryptionKey) {
    errors.push("TOKEN_ENCRYPTION_KEY is missing in .env.local (shared with QuickBooks)");
  } else if (encryptionKey.length < 32) {
    errors.push("TOKEN_ENCRYPTION_KEY should be at least 32 characters");
  }
  return { ok: errors.length === 0, errors };
}

export function getMondayConfig() {
  const graphqlUrl =
    trimEnv(process.env.MONDAY_GRAPHQL_URL) || "https://api.monday.com/v2";
  const fileUrl =
    trimEnv(process.env.MONDAY_FILE_URL) || "https://api.monday.com/v2/file";
  const encryptionKey = trimEnv(process.env.TOKEN_ENCRYPTION_KEY);
  const validation = validateMondayConfig();
  return {
    configured: validation.ok,
    validation,
    graphqlUrl,
    fileUrl,
    encryptionKey,
  };
}

export function boardItemUrl(boardId: string, itemId: string, accountSlug?: string | null): string {
  // Monday URLs must use the account subdomain (e.g. acme.monday.com). The bare
  // monday.com/boards/.../pulses/... path 404s. Slug is captured at connect time
  // from `me.account.slug`; if missing (legacy connection), fall back to the
  // board-only URL on the bare domain which redirects more reliably than the
  // pulses path.
  if (accountSlug) {
    return `https://${accountSlug}.monday.com/boards/${boardId}/pulses/${itemId}`;
  }
  return `https://monday.com/boards/${boardId}`;
}
