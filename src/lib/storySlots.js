// ============================================================
// Story Mode — five fixed save slots (device-local metadata).
// Slot index maps to GameSave.id; PIN fields stored on the save row.
// ============================================================

const STORAGE_KEY = "cakery_story_slots_v1";
export const STORY_SLOT_COUNT = 5;

const GAME_SAVE_STORAGE = "cakery_bakery_v1_game_saves";

function readSlotsRaw() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSlotsRaw(slots) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, version: 1 }));
}

function readSavesSync() {
  try {
    const raw = localStorage.getItem(GAME_SAVE_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function sortSavesDesc(rows) {
  return [...rows].sort((a, b) => {
    const tb = new Date(b.updated_date || b.created_date || 0).getTime();
    const ta = new Date(a.updated_date || a.created_date || 0).getTime();
    return tb - ta;
  });
}

/** Ensure slots array exists; migrate existing saves into slots once. */
export function getStorySlotAssignments() {
  const data = readSlotsRaw();
  if (data?.slots?.length === STORY_SLOT_COUNT) {
    return data.slots;
  }
  const saves = sortSavesDesc(readSavesSync());
  const slots = Array(STORY_SLOT_COUNT).fill(null);
  for (let i = 0; i < Math.min(STORY_SLOT_COUNT, saves.length); i++) {
    slots[i] = saves[i].id;
  }
  writeSlotsRaw(slots);
  return slots;
}

export function setStorySlotAssignments(slots) {
  if (!Array.isArray(slots) || slots.length !== STORY_SLOT_COUNT) {
    throw new Error("Invalid slots length");
  }
  writeSlotsRaw(slots);
}

export function clearStorySlotIndex(index) {
  const slots = [...getStorySlotAssignments()];
  slots[index] = null;
  writeSlotsRaw(slots);
}

/** Put saveId into slot `index`, clearing other slots that pointed at same id. */
export function assignSaveToSlot(index, saveId) {
  const slots = [...getStorySlotAssignments()];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === saveId) slots[i] = null;
  }
  slots[index] = saveId;
  writeSlotsRaw(slots);
}

export function firstEmptySlotIndex() {
  const slots = getStorySlotAssignments();
  return slots.findIndex((id) => id == null);
}

export function isStorySlotsFull() {
  return firstEmptySlotIndex() === -1;
}

/** Weak local PIN — not cryptographic security. */
export function hashStoryPin(pin) {
  const s = String(pin || "").replace(/\D/g, "").slice(0, 8);
  if (!s) return null;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `pin_${h}_${s.length}`;
}

export function verifyStoryPin(save, pin) {
  if (!save?.story_locked) return true;
  const expected = save.story_pin_hash;
  if (!expected) return true;
  return hashStoryPin(pin) === expected;
}

/** Clear any slot pointing at this save (e.g. after delete). */
export function removeSaveFromStorySlots(saveId) {
  if (saveId == null) return false;
  const slots = [...getStorySlotAssignments()];
  let changed = false;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === saveId) {
      slots[i] = null;
      changed = true;
    }
  }
  if (changed) writeSlotsRaw(slots);
  return changed;
}
