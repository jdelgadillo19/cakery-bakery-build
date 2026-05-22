import {
  CAKERY_GAME_ID,
  CAKERY_LOCAL_SAVES_KEY,
  SAVE_SCHEMA_VERSION,
  mergeMaxProgress,
} from "@gojito/shared/saves";
import { gojitoApiBaseUrl } from "@/lib/gojitoEntitlements";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

function readLocalSavesRaw() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAKERY_LOCAL_SAVES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalSavesRaw(rows) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CAKERY_LOCAL_SAVES_KEY, JSON.stringify(rows));
}

function rowFromCloudRecord(record) {
  const data = record?.save_data && typeof record.save_data === "object" ? record.save_data : {};
  return {
    ...data,
    id: data.id || record.id,
    cloud_id: record.id,
    updated_date: record.updated_at || data.updated_date,
    created_date: data.created_date || record.updated_at,
  };
}

function rowToSaveData(row) {
  const { cloud_id: _c, ...rest } = row;
  return {
    ...rest,
    id: row.id,
    schemaVersion: SAVE_SCHEMA_VERSION,
  };
}

function mergeSaveRows(a, b) {
  const merged = mergeMaxProgress(rowToSaveData(a), rowToSaveData(b));
  return {
    ...a,
    ...b,
    ...merged,
    id: a.id || b.id,
    updated_date: new Date().toISOString(),
  };
}

export async function getAuthenticatedUserId() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function listCloudSaves(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", CAKERY_GAME_ID)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[cakery] cloud list failed", error.message, error.code, error.details);
    return [];
  }

  return (data || []).map(rowFromCloudRecord);
}

async function upsertCloudSave(userId, row) {
  if (!supabase || !userId || !row?.id) {
    return { ok: false, row, error: "missing_session_or_row" };
  }

  const saveData = rowToSaveData(row);
  const payload = {
    id: row.id,
    user_id: userId,
    game_id: CAKERY_GAME_ID,
    save_data: saveData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("game_saves")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[cakery] cloud upsert failed", error.message, error.code, error.details);
    return { ok: false, row, error: error.message };
  }

  return { ok: true, row: { ...row, cloud_id: data?.id || row.id }, error: null };
}

export async function syncRowToCloud(row) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, row };
  return upsertCloudSave(userId, row);
}

export async function deleteCloudSaveByLocalId(localId) {
  const userId = await getAuthenticatedUserId();
  if (!supabase || !userId || !localId) return;

  const { error } = await supabase.from("game_saves").delete().eq("id", localId).eq("user_id", userId);

  if (error) {
    console.error("[cakery] cloud delete failed", error.message, error.code);
  }
}

async function previewBeanMerge(beanBlob, cloudBlob) {
  const base = gojitoApiBaseUrl();
  if (!base || !supabase) {
    return mergeMaxProgress(beanBlob, cloudBlob);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (base && token) {
    try {
      const res = await fetch(`${base}/api/migrations/bean-preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ beanSave: beanBlob, cloudSave: cloudBlob }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.mergedPreview && typeof json.mergedPreview === "object") {
          return json.mergedPreview;
        }
      }
    } catch {
      /* client-side fallback */
    }
  }
  return mergeMaxProgress(beanBlob, cloudBlob);
}

/**
 * Bidirectional sync: push local slots to account, merge cloud back into localStorage.
 * Call after login and when opening save lists on a new device/browser.
 */
export async function syncCakerySavesWithAccount(userId) {
  if (!userId || !supabase) {
    return { ok: false, cloudCount: 0, pushErrors: 0 };
  }

  const localRows = readLocalSavesRaw();
  let pushErrors = 0;

  for (const row of localRows) {
    const result = await upsertCloudSave(userId, row);
    if (!result.ok) pushErrors += 1;
  }

  let cloudRows = await listCloudSaves(userId);
  const byId = new Map();

  for (const cloudRow of cloudRows) {
    byId.set(cloudRow.id, cloudRow);
  }

  for (const localRow of localRows) {
    if (!byId.has(localRow.id)) {
      const beanBlob = rowToSaveData(localRow);
      const merged = await previewBeanMerge(beanBlob, {});
      byId.set(localRow.id, { ...localRow, ...merged, id: localRow.id });
      continue;
    }
    byId.set(localRow.id, mergeSaveRows(byId.get(localRow.id), localRow));
  }

  const merged = [...byId.values()];
  writeLocalSavesRaw(merged);

  cloudRows = await listCloudSaves(userId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gojito-cakery-saves-synced", { detail: { cloudCount: cloudRows.length } }));
  }

  return { ok: pushErrors === 0, cloudCount: cloudRows.length, pushErrors };
}

/** @deprecated Use syncCakerySavesWithAccount */
export async function migrateCakerySavesOnLogin(userId) {
  return syncCakerySavesWithAccount(userId);
}
