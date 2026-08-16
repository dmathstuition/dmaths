// Mathle — a daily "guess the equation" puzzle (Nerdle-style). Everyone gets the
// same equation each day, derived deterministically from the date, so there's a
// shared daily challenge with nothing to store server-side. Pure so the
// generator, validator and per-tile scoring are all unit-testable.

export const MATHLE_LEN = 8;        // e.g. "12+37=49"
export const MATHLE_TRIES = 6;
export type TileState = "correct" | "present" | "absent";

// Deterministic RNG from a string seed (mulberry32 over a small string hash).
function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The equation for a given day key ("YYYY-MM-DD"). Always 8 chars of the form
// AB±CD=EF with two-digit operands and a two-digit result, so the grid is fixed.
export function dailyEquation(dayKey: string): string {
  const rng = seededRng(`mathle:${dayKey}`);
  const n = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  // Alternate add / subtract by the seed; both keep a two-digit result.
  if (rng() < 0.5) {
    // AB + CD = EF, with 10 ≤ EF ≤ 99
    const a = n(10, 89);
    const b = n(10, 99 - a < 10 ? 10 : 99 - a);
    return `${a}+${b}=${a + b}`;
  }
  // AB - CD = EF, with EF two-digit → A ≥ C+10
  const a = n(20, 99);
  const b = n(10, a - 10);
  return `${a}-${b}=${a - b}`;
}

// Is a guess a legal, correct equation of the right length? One operator, an
// integer result, and the arithmetic must actually hold.
export function isValidEquation(guess: string): boolean {
  if (typeof guess !== "string" || guess.length !== MATHLE_LEN) return false; // length guard
  if (!/^[0-9+\-*/=]+$/.test(guess)) return false;
  const parts = guess.split("=");
  if (parts.length !== 2) return false;
  const [left, right] = parts;
  if (!/^\d+$/.test(right)) return false;
  const m = left.match(/^(\d+)([+\-*/])(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[3]);
  let val: number;
  switch (m[2]) {
    case "+": val = a + b; break;
    case "-": val = a - b; break;
    case "*": val = a * b; break;
    case "/": if (b === 0 || a % b !== 0) return false; val = a / b; break;
    default: return false;
  }
  return val === Number(right);
}

// Per-tile feedback with correct duplicate handling (two-pass, like Wordle):
// greens first, then presents limited by the remaining count of each character.
export function scoreGuess(guess: string, solution: string): TileState[] {
  const res: TileState[] = new Array(guess.length).fill("absent");
  const counts: Record<string, number> = {};
  for (const ch of solution) counts[ch] = (counts[ch] ?? 0) + 1;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solution[i]) { res[i] = "correct"; counts[guess[i]]--; }
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "correct") continue;
    const ch = guess[i];
    if ((counts[ch] ?? 0) > 0) { res[i] = "present"; counts[ch]--; }
  }
  return res;
}
