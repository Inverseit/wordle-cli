import { PatternCache } from "./pattern.js";
import type { PatternProvider } from "./patternProvider.js";

export function createPatternCacheProvider(
  answerWords: string[],
  dictionaryHash: string,
  patternDir?: string
): PatternProvider {
  const cache = new PatternCache(answerWords, dictionaryHash, patternDir);
  return {
    getRow(guess: string, force: boolean) {
      return cache.getRow(guess, force);
    },
  };
}

