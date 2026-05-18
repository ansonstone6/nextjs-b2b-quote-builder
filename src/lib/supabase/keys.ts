/**
 * Supabase dashboard (Settings -> API Keys) now uses **publishable** and **secret** keys.
 * Legacy `anon` / `service_role` JWT keys still work; we read them as fallbacks until you rotate.
 *
 * @see https://supabase.com/docs/guides/api/api-keys
 */

export function getSupabaseProjectUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Client-safe key (browser, SSR with RLS). Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Server-only key (never expose to the client). Prefer `SUPABASE_SECRET_KEY`. */
export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function requirePublishablePair(): { url: string; publishableKey: string } {
  const url = getSupabaseProjectUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase client credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(Settings -> API Keys -> Publishable). Legacy NEXT_PUBLIC_SUPABASE_ANON_KEY is still accepted as a fallback.",
    );
  }
  return { url, publishableKey };
}

export function requireSecretPair(): { url: string; secretKey: string } {
  const url = getSupabaseProjectUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY " +
        "(Settings -> API Keys -> Secret). Legacy SUPABASE_SERVICE_ROLE_KEY is still accepted as a fallback.",
    );
  }
  return { url, secretKey };
}
