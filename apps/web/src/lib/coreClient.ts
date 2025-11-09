import { WORDS } from "../../../../packages/core/src/lib/wordlist";
import { WORD_LENGTH } from "../../../../packages/core/src/lib/config";

export { WORDS, WORD_LENGTH };

export type PatternCode = number;

function base3EncodePattern(pattern: number[]): PatternCode {
  return pattern.reduce((acc, digit) => acc * 3 + digit, 0);
}

export function decodeBase3(code: PatternCode, length: number): number[] {
  const out = new Array<number>(length).fill(0);
  let current = code;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = current % 3;
    current = Math.floor(current / 3);
  }
  return out;
}

export function feedbackCode(guess: string, target: string): PatternCode {
  const L = WORD_LENGTH;
  const res = new Array<number>(L).fill(0);
  const freq = new Map<string, number>();

  for (let i = 0; i < L; i++) {
    const ch = target[i];
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  for (let i = 0; i < L; i++) {
    if (guess[i] === target[i]) {
      res[i] = 2;
      freq.set(guess[i], (freq.get(guess[i]) ?? 0) - 1);
    }
  }

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

