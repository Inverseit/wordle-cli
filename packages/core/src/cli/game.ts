/**
 * CLI Game Logic
 * 
 * Handles the game loop and user interaction for the CLI.
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  HardcoreSolver,
  FullEntropySolver,
  feedbackCode,
  parsePatternString,
  humanPattern,
  dictionarySignature,
  type SolverContext,
  type SolverHistoryEntry,
  filterWordIndices,
  createPatternCacheProvider,
} from "../lib/index.js";
import { PatternCache } from "../lib/pattern.js";

export async function precomputePatterns(
  guessWords: string[],
  answerWords: string[],
  cacheDir?: string,
  recompute: boolean = false
): Promise<void> {
  console.log(`Precomputing pattern rows for ${guessWords.length} guesses...`);
  const patternDir = cacheDir ? `${cacheDir}/patterns` : undefined;
  const dictionaryHash = dictionarySignature(guessWords, answerWords);
  const cache = new PatternCache(answerWords, dictionaryHash, patternDir);
  let done = 0;
  try {
    for (const g of guessWords) {
      cache.getRow(g, recompute);
      done++;
      if (done % 200 === 0) console.log(`  ${done}/${guessWords.length}`);
    }
    console.log("Done.");
  } finally {
    cache.flush();
  }
}

export async function runGame(
  mode: "hardcore" | "full",
  secret?: string,
  cacheDir?: string,
  recompute: boolean = false,
  maxWorkers: number = 16
): Promise<void> {
  const guessWords = VALID_GUESSES.map(w => w.toLowerCase());
  const answerWords = VALID_SECRETS.map(w => w.toLowerCase());
  const guessIndices = guessWords.map((_, i) => i);
  const answerIndices = answerWords.map((_, i) => i);
  const guessIndexByWord = new Map<string, number>(guessWords.map((w, i) => [w, i]));
  const answerIndexByWord = new Map<string, number>(answerWords.map((w, i) => [w, i]));
  const dictionaryHash = dictionarySignature(guessWords, answerWords);
  const patternDir = cacheDir ? `${cacheDir}/patterns` : undefined;
  const patternProviderFactory = () =>
    createPatternCacheProvider(answerWords, dictionaryHash, patternDir);

  // If auto mode is used, ensure the secret exists
  if (secret) {
    secret = secret.toLowerCase();
    if (!answerIndexByWord.has(secret)) {
      throw new Error(`--auto=${secret} not in answer list`);
    }
  }

  if (guessWords.length === 0) {
    throw new Error("Guess list is empty. Populate VALID_GUESSES before running.");
  }
  if (answerWords.length === 0) {
    throw new Error("Answer list is empty. Populate VALID_SECRETS before running.");
  }
  if (answerWords.some(w => w.length !== WORD_LENGTH)) {
    throw new Error("All answers must match WORD_LENGTH.");
  }
  if (guessWords.some(w => w.length !== WORD_LENGTH)) {
    throw new Error("All guesses must match WORD_LENGTH.");
  }
  if (answerWords.some(w => !guessIndexByWord.has(w))) {
    console.warn(
      "[runGame] Warning: Some answers are missing from the guess list; hardcore mode may skip them.",
    );
  }

  // Choose solver
  const solver = mode === "full" ? new FullEntropySolver() : new HardcoreSolver();

  // Game loop state
  const history: SolverHistoryEntry[] = [];
  let candidateAnswerIndices = filterWordIndices(answerWords, history, feedbackCode);

  // Interactive loop
  while (true) {
    const candidateGuessIndices = filterWordIndices(guessWords, history, feedbackCode);

    const ctx: SolverContext = {
      guessWords,
      answerWords,
      guessIndices,
      answerIndices,
      candidateAnswerIndices,
      candidateGuessIndices,
      guessIndexByWord,
      answerIndexByWord,
      dictionaryHash,
      length: WORD_LENGTH,
      recompute,
      maxWorkers: maxWorkers > 0 ? maxWorkers : 16,
      cacheDir,
      patternDir,
      patternProviderFactory,
    };

    const turn = history.length + 1;

    const { guessIndex, entropy } = await solver.nextGuess(ctx);
    if (guessIndex < 0) {
      console.error("No valid guess was produced. Check inputs and cache.");
      process.exit(1);
    }
    const guess = guessWords[guessIndex];

    console.log(
      `\nTurn ${turn} | Solver=${solver.name()} | Candidates=${candidateAnswerIndices.length}`,
    );
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

    history.push({ guess, pattern: patternCode });
    candidateAnswerIndices = filterWordIndices(answerWords, history, feedbackCode);

    // Check termination conditions
    if (candidateAnswerIndices.length === 1) {
      const ans = answerWords[candidateAnswerIndices[0]];
      const totalGuesses = history.length;
      console.log(
        `\nSolved in ${totalGuesses} ${totalGuesses === 1 ? "guess" : "guesses"}: ${ans.toUpperCase()}`,
      );
      break;
    }
    if (candidateAnswerIndices.length === 0) {
      console.error("\nNo candidates remain. Check feedback inputs or dictionary.");
      process.exit(1);
    }
  }
}

