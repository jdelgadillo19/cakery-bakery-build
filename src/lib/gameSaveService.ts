import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { CAKERY_GAME_ID } from "@gojito/shared/saves";

export type GameSaveRow = {
  id: string;
  user_id: string;
  game_id: string;
  save_data: Record<string, unknown>;
  updated_at: string | null;
};

export async function getGameSave(saveId: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("id", saveId)
    .single();

  if (error) throw error;
  return data as GameSaveRow;
}

export async function getUserGameSaves(userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", CAKERY_GAME_ID);

  if (error) throw error;
  return data as GameSaveRow[];
}

export async function updateGameSave(
  id: string,
  patch: Record<string, unknown>,
) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }
  const { data: existing, error: fetchError } = await supabase
    .from("game_saves")
    .select("save_data")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const merged = {
    ...(existing?.save_data || {}),
    ...patch,
  };

  const { data, error } = await supabase
    .from("game_saves")
    .update({
      save_data: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as GameSaveRow;
}
