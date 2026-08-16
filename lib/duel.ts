// Quiz Duel — pure bits (reward, sizing, outcome, code shape) so the rules are
// unit-testable; the API owns the questions, the answer key and the awarding.

export const DUEL_REWARD = 15;      // reward points to the winner
export const DUEL_QUESTIONS = 5;    // questions per duel
export const DUEL_MIN = 3;
export const DUEL_MAX = 10;

export function duelCount(requested?: number | string): number {
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return DUEL_QUESTIONS;
  return Math.max(DUEL_MIN, Math.min(DUEL_MAX, Math.round(n)));
}

// Who won, given both final scores. A tie is a draw (no reward).
export function duelOutcome(creatorScore: number, opponentScore: number): "creator" | "opponent" | "draw" {
  if (creatorScore > opponentScore) return "creator";
  if (opponentScore > creatorScore) return "opponent";
  return "draw";
}

// A short, unambiguous join code (no easily-confused characters).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeDuelCode(rng: () => number = Math.random, len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return out;
}
