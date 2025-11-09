import { WORD_LENGTH } from "./config.js";
import { base3EncodePattern } from "./utils.js";

/**
 * Compute Wordle-style feedback code for a guess against a target word.
 * Returns an integer in [0, 3^WORD_LENGTH).
 */
export function feedbackCode(guess: string, target: string): number {
  const L = WORD_LENGTH;
  const res = new Array<number>(L).fill(0);
  const freq = new Map<string, number>();

  for (let i = 0; i < L; i++) {
    const ch = target[i];
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  // Greens pass
  for (let i = 0; i < L; i++) {
    if (guess[i] === target[i]) {
      res[i] = 2;
      freq.set(guess[i], (freq.get(guess[i]) ?? 0) - 1);
    }
  }

  // Yellows pass
  for (let i = 0; i < L; i++) {
    if (res[i] !== 0) continue;
    const g = guess[i];
    const count = freq.get(g) ?? 0;
    if (count > 0) {
      res[i] = 1;
      freq.set(g, count - 1);
    }
  }

  return base3EncodePattern(res);
}

