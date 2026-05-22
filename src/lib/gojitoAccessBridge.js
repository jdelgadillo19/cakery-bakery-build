import { registerGojitoAccessTokenProvider } from "@gojito/entitlements";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

/**
 * Hub + games share Supabase session via `gojito-auth` storage key.
 */
export function registerGojitoHubAccessBridge() {
  if (!isSupabaseConfigured || !supabase) return;

  registerGojitoAccessTokenProvider(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  });
}
