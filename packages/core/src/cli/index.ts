#!/usr/bin/env node
/**
 * CLI Entry Point
 * 
 * Command-line interface for the Wordle solver.
 */

import { WORDS, WORD_LENGTH, sha256 } from "../lib/index.js";
import { parseArgs, parseCLIOptions } from "./args.js";
import { precomputePatterns, runGame } from "./game.js";

async function main() {
  // Validate dictionary
  if (WORDS.length === 0) {
    throw new Error("Dictionary (WORDS) is empty.");
  }
  if (WORDS.some(w => w.length !== WORD_LENGTH)) {
    throw new Error(`All words must be length=${WORD_LENGTH}`);
  }

  const args = parseArgs();
  const options = parseCLIOptions(args);

  const allWords = WORDS.map(w => w.toLowerCase());
  const wordHash = sha256(JSON.stringify({ len: allWords.length, words: allWords }));

  // Precompute mode: build all pattern rows and exit
  if (options.precompute) {
    await precomputePatterns(allWords, wordHash, options.cacheDir, options.recompute);
    process.exit(0);
  }

  // Run the game
  await runGame(
    options.mode,
    options.auto,
    options.cacheDir,
    options.recompute,
    options.maxWorkers
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

