import { createBrowserClient } from "@supabase/ssr";
import { requirePublishablePair } from "@/lib/supabase/keys";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = requirePublishablePair();
  return createBrowserClient(url, publishableKey);
}
