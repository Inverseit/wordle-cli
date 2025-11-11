export type PatternCode = number; // 0..728 for 6 letters (base-3 code)

export interface GuessEval {
  guessIndex: number;
  entropy: number;
}

import type { PatternProvider } from "./patternProvider.js";

export interface SolverContext {
  guessWords: string[];                // allowed guesses (size G)
  answerWords: string[];               // valid answers (size A)
  guessIndices: number[];              // [0..G-1]
  answerIndices: number[];             // [0..A-1]
  candidateAnswerIndices: number[];    // subset of answerIndices
  candidateGuessIndices?: number[];    // optional subset of guessIndices
  guessIndexByWord: Map<string, number>;
  answerIndexByWord: Map<string, number>;
  dictionaryHash: string;              // cache key for combined dictionaries
  length: number;                      // word length (e.g., 6)
  recompute: boolean;                  // force regenerate cache
  maxWorkers: number;                  // workers for parallel eval
  cacheDir?: string;                   // optional cache directory (defaults to "cache")
  patternDir?: string;                 // optional pattern cache directory (defaults to "${cacheDir}/patterns")
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