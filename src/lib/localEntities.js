// ============================================================
// Local persistence — replaces hosted backend entities.
// Game saves + leaderboard live in localStorage (device-local).
// ============================================================

const STORAGE_GAME_SAVES = "cakery_bakery_v1_game_saves";
const STORAGE_LEADERBOARD = "cakery_bakery_v1_leaderboard_entries";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function readSaves() {
  return readJson(STORAGE_GAME_SAVES, []);
}

function writeSaves(rows) {
  writeJson(STORAGE_GAME_SAVES, rows);
}

function sortByUpdatedDesc(rows) {
  return [...rows].sort((a, b) => {
    const tb = new Date(b.updated_date || b.created_date || 0).getTime();
    const ta = new Date(a.updated_date || a.created_date || 0).getTime();
    return tb - ta;
  });
}

/** Story / progression saves */
export const GameSave = {
  async list(sortSpec = "-updated_date", limit = 100) {
    let rows = readSaves();
    if (String(sortSpec).includes("updated")) rows = sortByUpdatedDesc(rows);
    return rows.slice(0, limit);
  },

  async filter(where = {}, sortSpec, limit) {
    let rows = readSaves();
    if (where.id != null) rows = rows.filter((r) => r.id === where.id);
    if (sortSpec != null && String(sortSpec).includes("updated")) {
      rows = sortByUpdatedDesc(rows);
    }
    if (typeof limit === "number") rows = rows.slice(0, limit);
    return rows;
  },

  async create(data) {
    const rows = readSaves();
    const ts = nowIso();
    const row = {
      ...data,
      id: crypto.randomUUID(),
      created_date: ts,
      updated_date: ts,
    };
    rows.push(row);
    writeSaves(rows);
    return row;
  },

  async update(id, patch) {
    const rows = readSaves();
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) throw new Error(`GameSave not found: ${id}`);
    rows[i] = {
      ...rows[i],
      ...patch,
      id,
      updated_date: nowIso(),
    };
    writeSaves(rows);
    return rows[i];
  },

  async delete(id) {
    writeSaves(readSaves().filter((r) => r.id !== id));
  },
};

function readLb() {
  return readJson(STORAGE_LEADERBOARD, []);
}

function writeLb(rows) {
  writeJson(STORAGE_LEADERBOARD, rows);
}

/** Arcade leaderboard rows */
export const LeaderboardEntry = {
  async create(data) {
    const rows = readLb();
    const row = {
      ...data,
      id: crypto.randomUUID(),
      created_date: nowIso(),
    };
    rows.push(row);
    writeLb(rows);
    return row;
  },

  async list(sortSpec = "-score", limit = 200) {
    let rows = [...readLb()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return rows.slice(0, limit);
  },

  async filter(where = {}, sortSpec = "-score", limit = 50) {
    let rows = readLb();
    if (where.player_name != null) {
      rows = rows.filter((r) => r.player_name === where.player_name);
    }
    rows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return rows.slice(0, limit);
  },

  async delete(id) {
    writeLb(readLb().filter((r) => r.id !== id));
  },
};
