export type TileEvaluation = "empty" | "editing" | "correct" | "present" | "absent";

export interface TileSnapshot {
  letter: string;
  state: TileEvaluation;
  flipDelay?: number;
}

export interface GuessSnapshot {
  tiles: TileSnapshot[];
  patternCode?: number;
  committed: boolean;
  invalid?: boolean;
}

export type KeyboardEvaluation = "unused" | "correct" | "present" | "absent";

export type KeyboardState = Record<string, KeyboardEvaluation>;

export interface GuessHistoryEntry {
  guess: string;
  pattern: number;
}

export type SolverMode = "hardcore";

export interface BotSuggestion {
  word: string;
  entropy: number;
}

