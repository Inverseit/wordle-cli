#!/usr/bin/env node

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  HardcoreSolver,
  feedbackCode,
  createInMemoryPatternProvider,
  dictionarySignature,
  type SolverContext,
} from "../dist/lib/index.js";

function assertLowercase(word: string): boolean {
  return word === word.toLowerCase();
}

function report(message: string) {
  console.log(`[validate-dicts] ${message}`);
}

async function smokeTest(): Promise<void> {
  if (VALID_GUESSES.length === 0 || VALID_SECRETS.length === 0) {
    report(
      "VALID_GUESSES or VALID_SECRETS is empty. Populate both lists before running solver smoke tests.",
    );
    return;
  }

  const guessWords = VALID_GUESSES.map((w) => w.toLowerCase());
  const answerWords = VALID_SECRETS.map((w) => w.toLowerCase());
  const guessIndices = guessWords.map((_, idx) => idx);
  const answerIndices = answerWords.map((_, idx) => idx);
  const guessIndexByWord = new Map<string, number>(
    guessWords.map((word, idx) => [word, idx]),
  );
  const answerIndexByWord = new Map<string, number>(
    answerWords.map((word, idx) => [word, idx]),
  );
  const dictionaryHash = dictionarySignature(guessWords, answerWords);
  const providerFactory = () => createInMemoryPatternProvider(answerWords);

  const solver = new HardcoreSolver();

  const samples = answerWords.slice(0, Math.min(3, answerWords.length));
  for (const answer of samples) {
    let candidateAnswerIndices = [...answerIndices];
    let turn = 1;
    while (turn <= WORD_LENGTH + 1) {
      const ctx: SolverContext = {
        guessWords,
        answerWords,
        guessIndices,
        answerIndices,
        candidateAnswerIndices,
        guessIndexByWord,
        answerIndexByWord,
        dictionaryHash,
        length: WORD_LENGTH,
        recompute: false,
        maxWorkers: 0,
        patternProviderFactory: providerFactory,
      };
      const { guessIndex } = await solver.nextGuess(ctx);
      if (guessIndex < 0) {
        throw new Error(`Solver failed to produce a guess for answer "${answer}".`);
      }
      const guess = guessWords[guessIndex];
      const pattern = feedbackCode(guess, answer);
      const nextCandidates: number[] = [];
      for (const idx of candidateAnswerIndices) {
        if (feedbackCode(guess, answerWords[idx]) === pattern) {
          nextCandidates.push(idx);
        }
      }
      candidateAnswerIndices = nextCandidates;
      if (candidateAnswerIndices.length === 1) {
        break;
      }
      turn++;
    }
    if (candidateAnswerIndices.length !== 1) {
      throw new Error(
        `Solver did not converge on answer "${answer}" within ${WORD_LENGTH + 1} turns.`,
      );
    }
  }
  report(`Smoke test succeeded for ${samples.length} sample answers.`);
}

async function main(): Promise<void> {
  report(`Guess words: ${VALID_GUESSES.length}`);
  report(`Answer words: ${VALID_SECRETS.length}`);

  const guessSet = new Set<string>();
  const secretSet = new Set<string>();

  for (const word of VALID_GUESSES) {
    if (word.length !== WORD_LENGTH) {
      throw new Error(`Guess word "${word}" does not match WORD_LENGTH=${WORD_LENGTH}.`);
    }
    if (!assertLowercase(word)) {
      throw new Error(`Guess word "${word}" must be lowercase.`);
    }
    if (guessSet.has(word)) {
      throw new Error(`Duplicate guess word detected: "${word}".`);
    }
    guessSet.add(word);
  }

  for (const word of VALID_SECRETS) {
    if (word.length !== WORD_LENGTH) {
      throw new Error(`Answer word "${word}" does not match WORD_LENGTH=${WORD_LENGTH}.`);
    }
    if (!assertLowercase(word)) {
      throw new Error(`Answer word "${word}" must be lowercase.`);
    }
    if (secretSet.has(word)) {
      throw new Error(`Duplicate answer word detected: "${word}".`);
    }
    secretSet.add(word);
    if (!guessSet.has(word)) {
      throw new Error(`Answer word "${word}" is missing from VALID_GUESSES.`);
    }
  }

  report("Dictionary integrity checks passed.");
  await smokeTest();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

