import { createClient } from "@supabase/supabase-js";
import { gojitoAuthClientOptions } from "@gojito/shared";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === "string" &&
    supabaseUrl.trim() &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim(),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), gojitoAuthClientOptions())
  : null;
