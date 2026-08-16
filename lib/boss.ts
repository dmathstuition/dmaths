// Weekly Boss Battle — each week a named question set (a question_bank group)
// becomes "the Boss". Learners get one attempt per week; clearing the pass mark
// defeats it for a one-off reward + a badge. Pure helpers here so the week key
// and pass logic are unit-testable; the API owns the questions and the answer key.

export const BOSS_DEFAULT_PASS = 70;    // % correct needed to defeat the boss
export const BOSS_DEFAULT_REWARD = 50;  // reward points for a first-time defeat
export const BOSS_MAX_QUESTIONS = 25;   // most questions served in one battle

// The current WAT week, keyed by the date of its Monday (YYYY-MM-DD). Stable for
// all seven days, so one attempt per key = one attempt per week.
export function bossWeek(now: Date = new Date()): string {
  // Shift to WAT (UTC+1) wall-clock, expressed through the UTC getters.
  const wat = new Date(now.getTime() + 60 * 60 * 1000);
  const dow = wat.getUTCDay();          // 0 = Sun … 6 = Sat
  const sinceMonday = (dow + 6) % 7;    // days back to Monday
  wat.setUTCDate(wat.getUTCDate() - sinceMonday);
  return wat.toISOString().slice(0, 10);
}

export function bossScorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, correct) / total) * 100);
}

export function bossPassed(correct: number, total: number, passPct: number): boolean {
  return total > 0 && bossScorePercent(correct, total) >= passPct;
}
