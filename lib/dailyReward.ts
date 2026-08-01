// The daily-reward roll. Weighted so most days give a little and a jackpot is
// rare — that surprise is what keeps the chest fun to open. Pure (takes the RNG)
// so it's deterministic under test.

export const DAILY_TIERS = [10, 20, 30, 50] as const;

export function rollDailyReward(rand: () => number = Math.random): number {
  const r = rand();
  if (r < 0.05) return 50; // jackpot ·  5%
  if (r < 0.20) return 30; //          · 15%
  if (r < 0.55) return 20; //          · 35%
  return 10; //                        · 45%
}

// The date (in WAT) a claim belongs to — one claim per calendar day.
export function watDay(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // YYYY-MM-DD
}
