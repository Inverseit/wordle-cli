"use server";

import {
  WORDS,
  WORD_LENGTH,
  feedbackCode,
  sha256,
  createInMemoryPatternProvider,
  HardcoreSolver,
  FullEntropySolver,
  type GuessEval,
  type SolverContext,
} from "@wordle/core";
import type {
  GuessHistoryEntry,
  SolverMode,
  BotSuggestion,
} from "../../lib/types";

export interface BotAnalysisResponse {
  suggestions: BotSuggestion[];
  candidateCount: number;
}

function filterCandidates(
  allWords: string[],
  history: GuessHistoryEntry[],
): number[] {
  if (history.length === 0) {
    return allWords.map((_, idx) => idx);
  }
  const normalizedHistory = history.map((item) => ({
    guess: item.guess.toLowerCase(),
    pattern: item.pattern,
  }));
  const matches: number[] = [];
  for (let idx = 0; idx < allWords.length; idx++) {
    const word = allWords[idx];
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

export async function computeSuggestions(
  history: GuessHistoryEntry[],
  mode: SolverMode,
  limit: number = 10,
): Promise<BotAnalysisResponse> {
  const allWords = WORDS.map((w) => w.toLowerCase());
  const candidateIndices = filterCandidates(allWords, history);
  const wordIndexByString = new Map<string, number>(
    allWords.map((word, idx) => [word, idx]),
  );
  const wordHash = sha256(
    JSON.stringify({ len: allWords.length, words: allWords }),
  );
  const allIndices = allWords.map((_, idx) => idx);

  const solver =
    mode === "full" ? new FullEntropySolver() : new HardcoreSolver();

  const ctx: SolverContext = {
    allWords,
    allIndices,
    candidateIndices,
    wordIndexByString,
    wordHash,
    length: WORD_LENGTH,
    recompute: false,
    maxWorkers: 0,
    patternProviderFactory: () => createInMemoryPatternProvider(allWords),
  };

  const suggestions: GuessEval[] = await solver.topGuesses(ctx, limit);

  return {
    suggestions: suggestions.map((item) => ({
      word: allWords[item.guessIndex],
      entropy: item.entropy,
    })),
    candidateCount: candidateIndices.length,
  };
}

