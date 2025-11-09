export type PatternCode = number; // 0..728 for 6 letters (base-3 code)

export interface GuessEval {
  guessIndex: number;
  entropy: number;
}

import type { PatternProvider } from "./patternProvider.js";

export interface SolverContext {
  allWords: string[];
  allIndices: number[];        // [0..N-1]
  candidateIndices: number[];  // subset of allIndices
  wordIndexByString: Map<string, number>;
  wordHash: string;            // cache key for dictionary validity
  length: number;              // 6
  recompute: boolean;          // force regenerate cache
  maxWorkers: number;          // workers for parallel eval
  cacheDir?: string;           // optional cache directory (defaults to "cache")
  patternDir?: string;         // optional pattern cache directory (defaults to "${cacheDir}/patterns")
  patternProviderFactory?: () => PatternProvider;
}

export interface Solver {
  name(): string;
  nextGuess(ctx: SolverContext): Promise<GuessEval>;
  topGuesses?(ctx: SolverContext, limit: number): Promise<GuessEval[]>;
}

export interface CLIFeedback {
  // user enters a 6-char string of digits 0/1/2
  pattern: PatternCode;
}