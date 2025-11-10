#!/usr/bin/env node
/**
 * CLI Entry Point
 * 
 * Command-line interface for the Wordle solver.
 */

import { VALID_GUESSES, VALID_SECRETS, WORD_LENGTH } from "../lib/index.js";
import { parseArgs, parseCLIOptions } from "./args.js";
import { precomputePatterns, runGame } from "./game.js";

async function main() {
  // Validate dictionary
  if (VALID_GUESSES.length === 0) {
    throw new Error("VALID_GUESSES is empty.");
  }
  if (VALID_SECRETS.length === 0) {
    throw new Error("VALID_SECRETS is empty.");
  }
  if (VALID_GUESSES.some(w => w.length !== WORD_LENGTH)) {
    throw new Error(`All guess words must be length=${WORD_LENGTH}`);
  }
  if (VALID_SECRETS.some(w => w.length !== WORD_LENGTH)) {
    throw new Error(`All answer words must be length=${WORD_LENGTH}`);
  }

  const args = parseArgs();
  const options = parseCLIOptions(args);

  const guessWords = VALID_GUESSES.map(w => w.toLowerCase());
  const answerWords = VALID_SECRETS.map(w => w.toLowerCase());

  // Precompute mode: build all pattern rows and exit
  if (options.precompute) {
    await precomputePatterns(
      guessWords,
      answerWords,
      options.cacheDir,
      options.recompute,
    );
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

