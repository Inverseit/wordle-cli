import { feedbackCode } from "./feedback.js";

export interface PatternProvider {
  getRow(guess: string, force: boolean): Uint16Array;
}

export function createInMemoryPatternProvider(answerWords: string[]): PatternProvider {
  const memo = new Map<string, Uint16Array>();

  return {
    getRow(guess: string, force: boolean) {
      if (!force) {
        const cached = memo.get(guess);
        if (cached) {
          return cached;
        }
      }

      const n = answerWords.length;
      const row = new Uint16Array(n);
      for (let i = 0; i < n; i++) {
        row[i] = feedbackCode(guess, answerWords[i]);
      }

      if (!force) {
        memo.set(guess, row);
      }

      return row;
    },
  };
}

