"use server";

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  createInMemoryPatternProvider,
  createPatternCacheProvider,
  HardcoreSolver,
  dictionarySignature,
} from "@wordle/core";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  GuessHistoryEntry,
  SolverMode,
  BotSuggestion,
} from "../../lib/types";
import {
  computeBotSuggestionsThroughSolver,
  type BotSolverEnvironment,
} from "../../lib/botSolver";

export interface BotAnalysisResponse {
  suggestions: BotSuggestion[];
  candidateCount: number;
}

import initialSuggestionsData from "../../generated/initialSuggestions.json";

const GUESS_WORDS = VALID_GUESSES.map((word) => word.toLowerCase());
const ANSWER_WORDS = VALID_SECRETS.map((word) => word.toLowerCase());
const GUESS_INDICES = GUESS_WORDS.map((_, idx) => idx);
const ANSWER_INDICES = ANSWER_WORDS.map((_, idx) => idx);
const GUESS_INDEX_BY_WORD = new Map<string, number>(
  GUESS_WORDS.map((word, idx) => [word, idx]),
);
const ANSWER_INDEX_BY_WORD = new Map<string, number>(
  ANSWER_WORDS.map((word, idx) => [word, idx]),
);
const SECRET_WORD_SET = new Set(ANSWER_WORDS);
const DICTIONARY_HASH = dictionarySignature(GUESS_WORDS, ANSWER_WORDS);

const PATTERN_DIR = path.join(
  process.cwd(),
  "public",
  "cache",
  "patterns",
);

const HAS_CACHE_DIR = existsSync(PATTERN_DIR);

const PATTERN_PROVIDER_FACTORY = HAS_CACHE_DIR
  ? () => createPatternCacheProvider(ANSWER_WORDS, DICTIONARY_HASH, PATTERN_DIR)
  : () => createInMemoryPatternProvider(ANSWER_WORDS);

const SOLVER_ENVIRONMENT: BotSolverEnvironment = {
  guessWords: GUESS_WORDS,
  answerWords: ANSWER_WORDS,
  guessIndices: GUESS_INDICES,
  answerIndices: ANSWER_INDICES,
  guessIndexByWord: GUESS_INDEX_BY_WORD,
  answerIndexByWord: ANSWER_INDEX_BY_WORD,
  dictionaryHash: DICTIONARY_HASH,
  patternProviderFactory: PATTERN_PROVIDER_FACTORY,
  wordLength: WORD_LENGTH,
  maxWorkers: 0,
  recompute: false,
};

const INITIAL_SUGGESTIONS: BotAnalysisResponse = {
  candidateCount: initialSuggestionsData.candidateCount,
  suggestions: initialSuggestionsData.suggestions.map((item) => ({
    ...item,
    isSecret: SECRET_WORD_SET.has(item.word.toLowerCase()),
  })),
};

export async function computeSuggestions(
  history: GuessHistoryEntry[],
  mode: SolverMode,
  limit: number = 10,
): Promise<BotAnalysisResponse> {
  if (mode !== "hardcore") {
    throw new Error(`Unsupported solver mode: ${mode}`);
  }

  if (history.length === 0 && limit <= INITIAL_SUGGESTIONS.suggestions.length) {
    return {
      suggestions: INITIAL_SUGGESTIONS.suggestions.slice(0, limit),
      candidateCount: INITIAL_SUGGESTIONS.candidateCount,
    };
  }

  const solver = new HardcoreSolver();

  return computeBotSuggestionsThroughSolver({
    history,
    limit,
    solver,
    environment: SOLVER_ENVIRONMENT,
  });
}

