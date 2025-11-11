import {
  feedbackCode,
  filterWordIndices,
  type PatternProvider,
  type Solver,
  type SolverContext,
  type SolverHistoryEntry,
} from "@wordle/core";

import type { BotSuggestion, GuessHistoryEntry } from "./types";

export interface BotSolverEnvironment {
  guessWords: string[];
  answerWords: string[];
  guessIndices: number[];
  answerIndices: number[];
  guessIndexByWord: Map<string, number>;
  answerIndexByWord: Map<string, number>;
  dictionaryHash: string;
  patternProviderFactory: () => PatternProvider;
  wordLength: number;
  recompute?: boolean;
  maxWorkers?: number;
}

export interface ComputeBotSuggestionsArgs {
  history: GuessHistoryEntry[];
  limit: number;
  solver: Solver;
  environment: BotSolverEnvironment;
}

export interface BotSolverResult {
  suggestions: BotSuggestion[];
  candidateCount: number;
}

export async function computeBotSuggestionsThroughSolver({
  history,
  limit,
  solver,
  environment,
}: ComputeBotSuggestionsArgs): Promise<BotSolverResult> {
  if (typeof solver.topGuesses !== "function") {
    throw new Error(`${solver.name()} does not support topGuesses()`);
  }

  const normalizedHistory: SolverHistoryEntry[] = history.map((entry) => ({
    guess: entry.guess.toLowerCase(),
    pattern: entry.pattern,
  }));

  const candidateAnswerIndices = filterWordIndices(
    environment.answerWords,
    normalizedHistory,
    feedbackCode,
  );

  const candidateGuessIndices = filterWordIndices(
    environment.guessWords,
    normalizedHistory,
    feedbackCode,
  );

  const ctx: SolverContext = {
    guessWords: environment.guessWords,
    answerWords: environment.answerWords,
    guessIndices: environment.guessIndices,
    answerIndices: environment.answerIndices,
    candidateAnswerIndices,
    candidateGuessIndices,
    guessIndexByWord: environment.guessIndexByWord,
    answerIndexByWord: environment.answerIndexByWord,
    dictionaryHash: environment.dictionaryHash,
    length: environment.wordLength,
    recompute: environment.recompute ?? false,
    maxWorkers: environment.maxWorkers ?? 0,
    patternProviderFactory: environment.patternProviderFactory,
  };

  const evaluations = await solver.topGuesses(ctx, limit);

  const suggestions: BotSuggestion[] = evaluations
    .filter((entry) => entry.guessIndex >= 0)
    .map((entry) => {
      const word = environment.guessWords[entry.guessIndex];
      return {
        word,
        entropy: entry.entropy,
        isSecret: environment.answerIndexByWord.has(word),
      };
    });

  return {
    suggestions,
    candidateCount: candidateAnswerIndices.length,
  };
}


