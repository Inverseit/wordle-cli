/**
 * CLI Game Logic
 * 
 * Handles the game loop and user interaction for the CLI.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  WORDS,
  WORD_LENGTH,
  HardcoreSolver,
  FullEntropySolver,
  feedbackCode,
  parsePatternString,
  humanPattern,
  sha256,
  type SolverContext,
  createPatternCacheProvider,
} from "../lib/index.js";
import { PatternCache } from "../lib/pattern.js";

export async function precomputePatterns(
  allWords: string[],
  wordHash: string,
  cacheDir?: string,
  recompute: boolean = false
): Promise<void> {
  console.log(`Precomputing pattern rows for ${allWords.length} words...`);
  const patternDir = cacheDir ? `${cacheDir}/patterns` : undefined;
  const cache = new PatternCache(allWords, wordHash, patternDir);
  let done = 0;
  for (const g of allWords) {
    cache.getRow(g, recompute);
    done++;
    if (done % 200 === 0) console.log(`  ${done}/${allWords.length}`);
  }
  console.log("Done.");
}

export async function runGame(
  mode: "hardcore" | "full",
  secret?: string,
  cacheDir?: string,
  recompute: boolean = false,
  maxWorkers: number = 16
): Promise<void> {
  const allWords = WORDS.map(w => w.toLowerCase());
  const allIndices = allWords.map((_, i) => i);
  const wordIndexByString = new Map<string, number>(allWords.map((w, i) => [w, i]));
  const wordHash = sha256(JSON.stringify({ len: allWords.length, words: allWords }));
  const patternDir = cacheDir ? `${cacheDir}/patterns` : undefined;
  const patternProviderFactory = () =>
    createPatternCacheProvider(allWords, wordHash, patternDir);

  // If auto mode is used, ensure the secret exists
  if (secret && !wordIndexByString.has(secret)) {
    throw new Error(`--auto=${secret} not in dictionary`);
  }

  // Choose solver
  const solver = mode === "full" ? new FullEntropySolver() : new HardcoreSolver();

  // Game loop state
  let candidateIndices = [...allIndices];
  let turn = 1;

  // Interactive loop
  while (true) {
    const ctx: SolverContext = {
      allWords,
      allIndices,
      candidateIndices,
      wordIndexByString,
      wordHash,
      length: WORD_LENGTH,
      recompute,
      maxWorkers: maxWorkers > 0 ? maxWorkers : 16,
      cacheDir,
      patternDir,
      patternProviderFactory,
    };

    const { guessIndex, entropy } = await solver.nextGuess(ctx);
    if (guessIndex < 0) {
      console.error("No valid guess was produced. Check inputs and cache.");
      process.exit(1);
    }
    const guess = allWords[guessIndex];

    console.log(`\nTurn ${turn} | Solver=${solver.name()} | Candidates=${candidateIndices.length}`);
    console.log(`Suggested guess: ${guess} (E[bits]=${entropy.toFixed(3)})`);

    // Obtain feedback pattern
    let patternCode: number;
    if (secret) {
      const code = feedbackCode(guess, secret);
      console.log(`Feedback (auto): ${humanPattern(code, WORD_LENGTH)}  [${code}]`);
      patternCode = code;
    } else {
      const rl = createInterface({ input, output });
      const prompt = `Enter pattern for "${guess}" as ${WORD_LENGTH} digits (0=⬜,1=🟨,2=🟩): `;
      const s = (await rl.question(prompt)).trim();
      rl.close();
      patternCode = parsePatternString(s, WORD_LENGTH);
      console.log(`You entered: ${humanPattern(patternCode, WORD_LENGTH)}`);
    }

    // Filter candidates by simulating this guess against each remaining candidate
    const nextCandidates: number[] = [];
    for (const idx of candidateIndices) {
      const code = feedbackCode(guess, allWords[idx]);
      if (code === patternCode) nextCandidates.push(idx);
    }
    candidateIndices = nextCandidates;

    // Check termination conditions
    if (candidateIndices.length === 1) {
      const ans = allWords[candidateIndices[0]];
      console.log(`\nSolved in ${turn} ${turn === 1 ? "guess" : "guesses"}: ${ans.toUpperCase()}`);
      break;
    }
    if (candidateIndices.length === 0) {
      console.error("\nNo candidates remain. Check feedback inputs or dictionary.");
      process.exit(1);
    }

    turn++;
  }
}

