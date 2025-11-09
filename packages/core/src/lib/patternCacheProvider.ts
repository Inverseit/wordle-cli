import { PatternCache } from "./pattern.js";
import type { PatternProvider } from "./patternProvider.js";

export function createPatternCacheProvider(
  allWords: string[],
  wordHash: string,
  patternDir?: string
): PatternProvider {
  const cache = new PatternCache(allWords, wordHash, patternDir);
  return {
    getRow(guess: string, force: boolean) {
      return cache.getRow(guess, force);
    },
  };
}

