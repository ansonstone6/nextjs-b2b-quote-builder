import { createClient } from "@supabase/supabase-js";
import { requireSecretPair } from "@/lib/supabase/keys";

/**
 * Server-only client using the **secret** API key (replaces legacy `service_role` JWT for new projects).
 * Never expose to the browser.
 */
export function createSupabaseAdminClient() {
  const { url, secretKey } = requireSecretPair();
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
