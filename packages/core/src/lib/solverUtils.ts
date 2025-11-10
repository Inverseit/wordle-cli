import { feedbackCode } from "./feedback.js";

export interface SolverHistoryEntry {
  guess: string;
  pattern: number;
}

export function filterWordIndices(
  words: string[],
  history: SolverHistoryEntry[],
  feedback: (guess: string, answer: string) => number = feedbackCode,
): number[] {
  if (history.length === 0) {
    return words.map((_, idx) => idx);
  }

  const normalizedHistory = history.map((entry) => ({
    guess: entry.guess.toLowerCase(),
    pattern: entry.pattern,
  }));

  const matches: number[] = [];

  for (let idx = 0; idx < words.length; idx++) {
    const candidate = words[idx];
    let valid = true;

    for (const { guess, pattern } of normalizedHistory) {
      if (feedback(guess, candidate) !== pattern) {
        valid = false;
        break;
      }
    }

    if (valid) {
      matches.push(idx);
    }
  }

  return matches;
}


