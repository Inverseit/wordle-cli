/**
 * Wordle Solver Library
 * 
 * Main entry point for the Wordle solver library.
 * Export all public APIs for use in Next.js or other applications.
 */

// Core types
export type { PatternCode, GuessEval, SolverContext, Solver } from "./types.js";

// Configuration
export { WORD_LENGTH, DEFAULT_CACHE_DIR, DEFAULT_PATTERN_DIR } from "./config.js";

// Word list
export { WORDS } from "./wordlist.js";

// Pattern matching
export { feedbackCode } from "./feedback.js";
export { createPatternCacheProvider } from "./patternCacheProvider.js";
export {
  createInMemoryPatternProvider,
  type PatternProvider,
} from "./patternProvider.js";

// Entropy calculation
export { entropyForGuess, entropyForGuessRow } from "./entropy.js";

// Utilities
export { parsePatternString, humanPattern, decodeBase3, base3EncodePattern } from "./utils.js";
export { sha256 } from "./utils/node.js";

// Solvers
export { BaseSolver } from "./solvers/BaseSolver.js";
export { HardcoreSolver } from "./solvers/HardcoreSolver.js";
export { FullEntropySolver } from "./solvers/FullEntropySolver.js";

