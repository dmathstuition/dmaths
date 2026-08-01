// Question generator for the Math Sprint mini-game. Pure (RNG injectable) so the
// answers can be checked in tests. Non-negative subtraction only.

export type Question = { text: string; answer: number };

export function makeQuestion(rand: () => number = Math.random): Question {
  const ops = ["+", "−", "×"] as const;
  const op = ops[Math.floor(rand() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "×") {
    a = 2 + Math.floor(rand() * 11); // 2..12
    b = 2 + Math.floor(rand() * 11);
    answer = a * b;
  } else if (op === "+") {
    a = 2 + Math.floor(rand() * 98); // 2..99
    b = 2 + Math.floor(rand() * 98);
    answer = a + b;
  } else {
    a = 10 + Math.floor(rand() * 90); // 10..99
    b = 1 + Math.floor(rand() * a);   // 1..a  → answer never negative
    answer = a - b;
  }

  return { text: `${a} ${op} ${b}`, answer };
}
