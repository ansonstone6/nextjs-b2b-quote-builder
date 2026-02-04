import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublishablePair } from "@/lib/supabase/keys";

/**
 * Supabase client for Route Handlers / Server Components (cookie session).
 * Uses the **publishable** API key (replaces legacy anon JWT for new projects).
 */
export async function createSupabaseServerClient() {
  const { url, publishableKey } = requirePublishablePair();

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* ignore when called from a Server Component that cannot set cookies */
        }
      },
    },
  });
}
