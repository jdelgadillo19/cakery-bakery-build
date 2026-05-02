// ============================================================
// Story Mode — per-save aggregate stats (device-local on GameSave)
// ============================================================

/** True when this save should use Story stats + skip arcade leaderboard. */
export function isStorySave(gameSave) {
  return gameSave?.game_mode === "story";
}

/**
 * Merge after a completed day (pay already reflected in net pay for the day).
 * @param {object|null} prev - existing story_stats_v1 or undefined
 * @param {{ customersServed: number, netPay: number, score: number }} day
 */
export function mergeStoryStatsAfterDay(prev, { customersServed, netPay, score }) {
  const base = prev || {
    lifetime_total_earnings: 0,
    best: {
      customers_served_day: 0,
      single_day_net_pay: 0,
      single_day_score: 0,
    },
    last_updated_iso: null,
  };
  const best = base.best || {};
  const cs = Math.max(Number(best.customers_served_day || 0), Number(customersServed || 0));
  const np = Math.round(Math.max(Number(best.single_day_net_pay || 0), Number(netPay || 0)) * 100) / 100;
  const sc = Math.round(Math.max(Number(best.single_day_score || 0), Number(score || 0)) * 100) / 100;
  const lifetime =
    Math.round((Number(base.lifetime_total_earnings || 0) + Number(netPay || 0)) * 100) / 100;

  return {
    story_stats_v1: {
      lifetime_total_earnings: lifetime,
      best: {
        customers_served_day: cs,
        single_day_net_pay: np,
        single_day_score: sc,
      },
      last_updated_iso: new Date().toISOString(),
    },
  };
}
