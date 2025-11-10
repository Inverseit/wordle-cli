"use server";

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  feedbackCode,
  createInMemoryPatternProvider,
  createPatternCacheProvider,
  HardcoreSolver,
  FullEntropySolver,
  dictionarySignature,
  type GuessEval,
  type SolverContext,
} from "@wordle/core";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  GuessHistoryEntry,
  SolverMode,
  BotSuggestion,
} from "../../lib/types";

export interface BotAnalysisResponse {
  suggestions: BotSuggestion[];
  candidateCount: number;
}

import initialSuggestionsData from "../../generated/initialSuggestions.json";

const SECRET_WORD_SET = new Set(VALID_SECRETS.map((w) => w.toLowerCase()));

const INITIAL_SUGGESTIONS: BotAnalysisResponse = {
  candidateCount: initialSuggestionsData.candidateCount,
  suggestions: initialSuggestionsData.suggestions.map((item) => ({
    ...item,
    isSecret: SECRET_WORD_SET.has(item.word.toLowerCase()),
  })),
};

function createSolver(mode: SolverMode) {
  if (mode === "hardcore") {
    return new HardcoreSolver();
  }
  return new FullEntropySolver();
}

function filterCandidates(
  answerWords: string[],
  history: GuessHistoryEntry[],
): number[] {
  if (history.length === 0) {
    return answerWords.map((_, idx) => idx);
  }
  const normalizedHistory = history.map((item) => ({
    guess: item.guess.toLowerCase(),
    pattern: item.pattern,
  }));
  const matches: number[] = [];
  for (let idx = 0; idx < answerWords.length; idx++) {
    const word = answerWords[idx];
    let valid = true;
    for (const entry of normalizedHistory) {
      const code = feedbackCode(entry.guess, word);
      if (code !== entry.pattern) {
        valid = false;
        break;
      }
    }
    if (valid) matches.push(idx);
  }
  return matches;
}

const PATTERN_DIR = path.join(
  process.cwd(),
  "public",
  "cache",
  "patterns",
);

const HAS_CACHE_DIR = existsSync(PATTERN_DIR);

export async function computeSuggestions(
  history: GuessHistoryEntry[],
  mode: SolverMode,
  limit: number = 10,
): Promise<BotAnalysisResponse> {
  if (history.length === 0 && limit <= INITIAL_SUGGESTIONS.suggestions.length) {
    return {
      suggestions: INITIAL_SUGGESTIONS.suggestions.slice(0, limit),
      candidateCount: INITIAL_SUGGESTIONS.candidateCount,
    };
  }

  const guessWords = VALID_GUESSES.map((w) => w.toLowerCase());
  const answerWords = VALID_SECRETS.map((w) => w.toLowerCase());
  const candidateAnswerIndices = filterCandidates(answerWords, history);
  const answerIndices = answerWords.map((_, idx) => idx);
  const guessIndices = guessWords.map((_, idx) => idx);
  const guessIndexByWord = new Map<string, number>(
    guessWords.map((word, idx) => [word, idx]),
  );
  const answerIndexByWord = new Map<string, number>(
    answerWords.map((word, idx) => [word, idx]),
  );
  const dictionaryHash = dictionarySignature(guessWords, answerWords);

  const solver = createSolver(mode);

  const providerFactory =
    HAS_CACHE_DIR
      ? () => createPatternCacheProvider(answerWords, dictionaryHash, PATTERN_DIR)
      : () => createInMemoryPatternProvider(answerWords);

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

  const suggestions: GuessEval[] = await solver.topGuesses(ctx, limit);

  return {
    suggestions: suggestions.map((item) => {
      const word = guessWords[item.guessIndex];
      return {
        word,
        entropy: item.entropy,
        isSecret: answerIndexByWord.has(word),
      };
    }),
    candidateCount: candidateAnswerIndices.length,
  };
}

