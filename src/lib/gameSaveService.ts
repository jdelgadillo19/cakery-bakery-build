import { supabase } from "@/platform/supabase/client";

export type GameSaveRow = {
  id: string;
  user_id: string;
  game_id: string;
  save_data: any;
  updated_at: string | null;
};

// -------------------------
// Load save(s)
// -------------------------

export async function getGameSave(saveId: string) {
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("id", saveId)
    .single();

  if (error) throw error;
  return data as GameSaveRow;
}

export async function getUserGameSaves(userId: string) {
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data as GameSaveRow[];
}

// -------------------------
// Update save
// -------------------------

export async function updateGameSave(
  id: string,
  patch: Partial<GameSaveRow["save_data"]>
) {
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