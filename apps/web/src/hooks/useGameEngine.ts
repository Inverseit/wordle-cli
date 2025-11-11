"use client";

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  feedbackCode,
  type PatternCode,
} from "@wordle/core/browser";
import { useCallback, useMemo, useState } from "react";
import { WORDLE_MAX_ATTEMPTS } from "../lib/constants";
import {
  type GuessSnapshot,
  type KeyboardEvaluation,
  type KeyboardState,
  type TileEvaluation,
} from "../lib/types";
import { patternCodeToEvaluations } from "../lib/patternHelpers";

const DICTIONARY_SET = new Set(VALID_GUESSES.map((w) => w.toLowerCase()));

type GameStatus = "playing" | "won" | "lost";

interface CommitSuccess {
  ok: true;
  guess: string;
  pattern: PatternCode;
  evaluations: TileEvaluation[];
}

interface CommitError {
  ok: false;
  reason: "finished" | "incomplete" | "invalid";
  message: string;
}

export type CommitResult = CommitSuccess | CommitError;

function randomSecret(): string {
  if (VALID_SECRETS.length === 0) {
    console.warn("[useGameEngine] VALID_SECRETS is empty; using placeholder secret.");
    return "secret"; // fallback placeholder (ensure WORD_LENGTH compatibility)
  }
  const idx = Math.floor(Math.random() * VALID_SECRETS.length);
  return VALID_SECRETS[idx].toLowerCase();
}

function emptyRow(): GuessSnapshot {
  return {
    tiles: Array.from({ length: WORD_LENGTH }, () => ({
      letter: "",
      state: "empty" as TileEvaluation,
    })),
    committed: false,
  };
}

function initialRows(): GuessSnapshot[] {
  return Array.from({ length: WORDLE_MAX_ATTEMPTS }, emptyRow);
}

function mergeKeyboardState(
  prev: KeyboardState,
  guess: string,
  evaluations: TileEvaluation[],
): KeyboardState {
  const next: KeyboardState = { ...prev };
  guess.split("").forEach((letter, idx) => {
    const state = evaluations[idx];
    const rank = evaluationRank(state);
    const currentRank = evaluationRank(next[letter] ?? "unused");
    if (rank > currentRank) {
      next[letter] = state === "empty" ? "unused" : (state as KeyboardEvaluation);
    }
  });
  return next;
}

function evaluationRank(state: TileEvaluation | KeyboardEvaluation | "unused"): number {
  switch (state) {
    case "correct":
      return 3;
    case "present":
      return 2;
    case "absent":
      return 1;
    default:
      return 0;
  }
}

function isDictionaryWord(word: string): boolean {
  if (DICTIONARY_SET.size === 0) {
    return true;
  }
  return DICTIONARY_SET.has(word);
}

export interface GameEngineControls {
  rows: GuessSnapshot[];
  currentRowIndex: number;
  keyboard: KeyboardState;
  status: GameStatus;
  message: string | null;
  secret: string;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  commitGuess: (guess: string) => CommitResult;
  resetGame: (secret?: string) => void;
}

export function useGameEngine(initialSecret?: string): GameEngineControls {
  const [secret, setSecret] = useState(() =>
    (initialSecret ?? randomSecret()).toLowerCase(),
  );
  const [rows, setRows] = useState<GuessSnapshot[]>(() => initialRows());
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [keyboard, setKeyboard] = useState<KeyboardState>({});
  const [status, setStatus] = useState<GameStatus>("playing");
  const [message, setMessage] = useState<string | null>(null);

  const updateRow = useCallback(
    (updater: (row: GuessSnapshot) => GuessSnapshot) => {
      setRows((prev) =>
        prev.map((row, idx) => {
          if (idx !== currentRowIndex) return row;
          return updater(row);
        }),
      );
    },
    [currentRowIndex],
  );

  const addLetter = useCallback(
    (letter: string) => {
      if (status !== "playing") return;
      const normalized = letter.toLowerCase();
      if (!/^[\p{L}]$/u.test(normalized)) return;
      updateRow((row) => {
        const currentLetters = row.tiles.map((tile) => tile.letter).join("");
        if (currentLetters.length >= WORD_LENGTH) return row;
        const nextTiles = row.tiles.map((tile, idx) => {
          if (idx === currentLetters.length) {
            return { letter: normalized, state: "editing" as TileEvaluation };
          }
          if (tile.state === "editing" && idx > currentLetters.length) {
            return { letter: "", state: "empty" as TileEvaluation };
          }
          return tile;
        });
        for (let i = currentLetters.length + 1; i < WORD_LENGTH; i++) {
          nextTiles[i] = { letter: "", state: "empty" };
        }
        return {
          ...row,
          tiles: nextTiles,
          invalid: false,
        };
      });
      setMessage(null);
    },
    [status, updateRow],
  );

  const removeLetter = useCallback(() => {
    if (status !== "playing") return;
    updateRow((row) => {
      const currentLetters = row.tiles.map((tile) => tile.letter).join("");
      const nextLen = Math.max(0, currentLetters.length - 1);
      const nextTiles = row.tiles.map((tile, idx) => {
        if (idx === nextLen) return { letter: "", state: "empty" as TileEvaluation };
        if (idx < nextLen) return { ...tile, state: "editing" as TileEvaluation };
        return { letter: "", state: "empty" as TileEvaluation };
      });
      return { ...row, tiles: nextTiles, invalid: false };
    });
    setMessage(null);
  }, [status, updateRow]);

  const commitGuess = useCallback(
    (guessInput: string): CommitResult => {
      if (status !== "playing") {
        return {
          ok: false,
          reason: "finished",
          message: "Ойын аяқталды.",
        };
      }
      const guess = guessInput.toLowerCase();
      if (guess.length !== WORD_LENGTH) {
        return {
          ok: false,
          reason: "incomplete",
          message: "Әлі толық емес.",
        };
      }
      if (!isDictionaryWord(guess)) {
        return {
          ok: false,
          reason: "invalid",
          message: "Сөз сөздікте жоқ.",
        };
      }

      const pattern: PatternCode = feedbackCode(guess, secret);
      const evaluations = patternCodeToEvaluations(pattern);

      setRows((prev) =>
        prev.map((row, idx) => {
          if (idx !== currentRowIndex) return row;
          return {
            tiles: Array.from({ length: WORD_LENGTH }, (_, tileIdx) => ({
              letter: guess[tileIdx] ?? "",
              state: evaluations[tileIdx],
              flipDelay: tileIdx * 120,
            })),
            committed: true,
            patternCode: pattern,
            invalid: false,
          };
        }),
      );

      setKeyboard((prev) => mergeKeyboardState(prev, guess, evaluations));

      const won = evaluations.every((state) => state === "correct");
      if (won) {
        setStatus("won");
        setMessage("Керемет!");
        return { ok: true, guess, pattern, evaluations };
      }

      const nextIndex = currentRowIndex + 1;
      if (nextIndex >= WORDLE_MAX_ATTEMPTS) {
        setStatus("lost");
        setMessage(`Жауап: ${secret.toUpperCase()}`);
        return { ok: true, guess, pattern, evaluations };
      }

      setCurrentRowIndex(() => nextIndex);
      setMessage(null);

      return { ok: true, guess, pattern, evaluations };
    },
    [status, secret, currentRowIndex],
  );

  const submitGuess = useCallback(() => {
    if (status !== "playing") return;
    const row = rows[currentRowIndex];
    const guess = row.tiles.map((tile) => tile.letter).join("");
    const result = commitGuess(guess);
    if (!result.ok) {
      setMessage(result.message);
      if (result.reason === "incomplete" || result.reason === "invalid") {
        updateRow((prev) => ({ ...prev, invalid: true }));
      }
      return;
    }
  }, [status, rows, currentRowIndex, commitGuess, updateRow]);

  const resetGame = useCallback(
    (nextSecret?: string) => {
      const freshSecret = (nextSecret ?? randomSecret()).toLowerCase();
      setSecret(freshSecret);
      setRows(initialRows());
      setKeyboard({});
      setCurrentRowIndex(0);
      setStatus("playing");
      setMessage(null);
    },
    [],
  );

  const hydratedRows = useMemo(() => {
    return rows.map((row, idx) => {
      if (row.committed || idx !== currentRowIndex) return row;
      const letters = row.tiles.map((tile) => tile.letter);
      const nextTiles = Array.from({ length: WORD_LENGTH }, (_, tileIdx) => {
        const letter = letters[tileIdx] ?? "";
        const state: TileEvaluation =
          letter.length > 0 ? "editing" : "empty";
        return { letter, state };
      });
      return { ...row, tiles: nextTiles };
    });
  }, [rows, currentRowIndex]);

  return {
    rows: hydratedRows,
    currentRowIndex,
    keyboard,
    status,
    message,
    secret,
    addLetter,
    removeLetter,
    submitGuess,
    commitGuess,
    resetGame,
  };
}

