"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { WORD_LENGTH } from "@wordle/core/browser";
import type {
  BotSuggestion,
  GuessHistoryEntry,
  GuessSnapshot,
  TileEvaluation,
} from "../../lib/types";
import { SuggestionList } from "../../components/SuggestionList";
import { ManualBoardSection } from "../../components/ManualBoardSection";
import {
  computeSuggestions,
  type BotAnalysisResponse,
} from "../bot/actions";
import { WORDLE_MAX_ATTEMPTS } from "../../lib/constants";
import {
  cycleTileState,
  emptyPattern,
  isPatternComplete,
  patternCodeToTileEvaluations,
  tileEvaluationsToPatternCode,
} from "../../lib/patternUtils";

import initialSuggestionsData from "../../generated/initialSuggestions.json";

const SOLVER_MODE = "hardcore";
const INITIAL_RESPONSE = initialSuggestionsData as BotAnalysisResponse;

function toCacheKey(history: GuessHistoryEntry[]): string {
  if (history.length === 0) return SOLVER_MODE;
  const signature = history
    .map((entry) => `${entry.guess}:${entry.pattern}`)
    .join("|");
  return `${SOLVER_MODE}|${signature}`;
}

function historyToSnapshots(history: GuessHistoryEntry[]): GuessSnapshot[] {
  return history.map((entry) => {
    const evaluations = patternCodeToTileEvaluations(entry.pattern, WORD_LENGTH);
    return {
      tiles: Array.from({ length: WORD_LENGTH }, (_, idx) => ({
        letter: entry.guess[idx] ?? "",
        state: evaluations[idx],
      })),
      patternCode: entry.pattern,
      committed: true,
    };
  });
}

function pendingSnapshot(
  pendingGuess: string | null,
  pattern: TileEvaluation[],
): GuessSnapshot {
  return {
    tiles: Array.from({ length: WORD_LENGTH }, (_, idx) => ({
      letter: pendingGuess ? pendingGuess[idx] ?? "" : "",
      state: pendingGuess ? pattern[idx] ?? "empty" : "empty",
    })),
    committed: false,
  };
}

function emptySnapshot(): GuessSnapshot {
  return {
    tiles: Array.from({ length: WORD_LENGTH }, () => ({
      letter: "",
      state: "empty" as TileEvaluation,
    })),
    committed: false,
  };
}

export default function ManualSolverPage() {
  const [attempts, setAttempts] = useState<GuessHistoryEntry[]>([]);
  const [pendingGuess, setPendingGuess] = useState<string | null>(null);
  const [pendingPattern, setPendingPattern] = useState<TileEvaluation[]>(
    () => emptyPattern(WORD_LENGTH),
  );
  const [suggestions, setSuggestions] = useState<BotSuggestion[]>(
    INITIAL_RESPONSE.suggestions,
  );
  const [candidateCount, setCandidateCount] = useState<number | null>(
    INITIAL_RESPONSE.candidateCount,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const suggestionCacheRef = useRef<Map<string, BotAnalysisResponse>>(
    new Map([[SOLVER_MODE, INITIAL_RESPONSE]]),
  );
  const [isPending, startTransition] = useTransition();

  const cacheKey = useMemo(() => toCacheKey(attempts), [attempts]);

  useEffect(() => {
    if (attempts.length === 0) {
      setSuggestions(INITIAL_RESPONSE.suggestions);
      setCandidateCount(INITIAL_RESPONSE.candidateCount);
      return;
    }

    const cached = suggestionCacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached.suggestions);
      setCandidateCount(cached.candidateCount);
      return;
    }

    let cancelled = false;
    setCandidateCount(null);
    startTransition(async () => {
      const response = await computeSuggestions(attempts, SOLVER_MODE, 10);
      if (!cancelled) {
        setSuggestions(response.suggestions);
        setCandidateCount(response.candidateCount);
        suggestionCacheRef.current.set(cacheKey, response);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attempts, cacheKey]);

  const committedRows = useMemo(
    () => historyToSnapshots(attempts),
    [attempts],
  );

  const pendingRow = useMemo(
    () => pendingSnapshot(pendingGuess, pendingPattern),
    [pendingGuess, pendingPattern],
  );

  const rowsWithPending = useMemo(
    () => [...committedRows, pendingRow],
    [committedRows, pendingRow],
  );
  const totalRows = Math.max(rowsWithPending.length, WORDLE_MAX_ATTEMPTS);
  const fillerCount = Math.max(0, totalRows - rowsWithPending.length);
  const fillerRows = useMemo(
    () => Array.from({ length: fillerCount }, () => emptySnapshot()),
    [fillerCount],
  );
  const boardRows = useMemo(
    () => [...rowsWithPending, ...fillerRows],
    [rowsWithPending, fillerRows],
  );

  const editableRowIndex = pendingGuess ? committedRows.length : null;
  const activeRowIndex = committedRows.length;

  const handleSelectSuggestion = useCallback((word: string) => {
    const normalized = word.toUpperCase();
    setPendingGuess(normalized);
    setPendingPattern(emptyPattern(WORD_LENGTH));
    setFormError(null);
  }, []);

  const handleTileClick = useCallback((tileIndex: number) => {
    if (!pendingGuess) {
      setFormError("Алдымен ұсынылған сөзді таңдаңыз.");
      return;
    }
    setFormError(null);
    setPendingPattern((prev) => {
      const next = [...prev];
      next[tileIndex] = cycleTileState(next[tileIndex]);
      return next;
    });
  }, [pendingGuess]);

  const handleSubmitAttempt = useCallback(() => {
    if (!pendingGuess) {
      setFormError("Алдымен ұсынылған сөзді таңдаңыз.");
      return;
    }
    if (!isPatternComplete(pendingPattern)) {
      setFormError("Барлық ұяшықтардың күйі белгіленуі керек.");
      return;
    }

    const entry: GuessHistoryEntry = {
      guess: pendingGuess,
      pattern: tileEvaluationsToPatternCode(pendingPattern),
    };

    setAttempts((prev) => [...prev, entry]);
    setPendingGuess(null);
    setPendingPattern(emptyPattern(WORD_LENGTH));
    setFormError(null);
  }, [pendingGuess, pendingPattern]);

  const handleUndoLast = useCallback(() => {
    setAttempts((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const last = prev[prev.length - 1];
      setPendingGuess(last.guess);
      setPendingPattern(
        patternCodeToTileEvaluations(last.pattern, WORD_LENGTH),
      );
      return next;
    });
    setFormError(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    setAttempts([]);
    setPendingGuess(null);
    setPendingPattern(emptyPattern(WORD_LENGTH));
    setFormError(null);
  }, []);

  const disableSubmit =
    isPending ||
    !pendingGuess ||
    !isPatternComplete(pendingPattern);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-white">Қолмен анализ</h1>
        <p className="text-sm text-white/60">
          Wordle ойынының нақты жүрістерін енгізіп, боттың келесі ең ақпараттық
          ұсынысын алыңыз. Әр әрекет ұсыныстар тізімінен таңдалған сөзге және
          Wordle берген өрнек кодының күйіне негізделеді.
        </p>
      </header>

      <ManualBoardSection
        rows={boardRows}
        activeRowIndex={activeRowIndex}
        editableRowIndex={editableRowIndex}
        pendingGuess={pendingGuess}
        pendingPattern={pendingPattern}
        onTileClick={handleTileClick}
        onSubmit={handleSubmitAttempt}
        onResetPattern={() => {
          setPendingPattern(emptyPattern(WORD_LENGTH));
          setFormError(null);
        }}
        onClearHistory={handleClearHistory}
        onUndoLast={handleUndoLast}
        hasHistory={attempts.length > 0}
        disableSubmit={disableSubmit}
        loading={isPending}
        wordLength={WORD_LENGTH}
        formError={formError}
      />

      <SuggestionList
        suggestions={suggestions}
        candidateCount={candidateCount}
        loading={isPending}
        mode="select"
        onSelect={handleSelectSuggestion}
        selectedWord={pendingGuess}
        disabled={isPending}
      />
    </div>
  );
}

