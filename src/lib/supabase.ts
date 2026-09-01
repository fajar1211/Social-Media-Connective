import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "https://jzwmgcldazvuoxvbmkzu.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "sb_publishable_g1Z1qWDQELk9jNUkQrE71A_cZES6Y-n";

const isConfigured = Boolean(url && key);

function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  if (!isConfigured) {
    return null as unknown as SupabaseClient;
  }

  _supabase = createClient(url!, key!);
  return _supabase;
}

export function getSupabaseClient(): SupabaseClient {
  return getSupabase();
}

export const supabaseConfigured = isConfigured;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) return prop === "auth" ? { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), getSession: () => Promise.resolve({ data: { session: null } }) } : undefined;
    const value = (client as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
