"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { GameBoard } from "../../components/GameBoard";
import { SecretControls } from "../../components/SecretControls";
import { SuggestionList } from "../../components/SuggestionList";
import { HistoryTimeline } from "../../components/HistoryTimeline";
import { useGameEngine } from "../../hooks/useGameEngine";
import { computeSuggestions, type BotAnalysisResponse } from "./actions";
import { cn } from "../../lib/cn";
import type {
  BotSuggestion,
  GuessHistoryEntry,
  SolverMode,
} from "../../lib/types";
import { VALID_SECRETS, WORD_LENGTH } from "@wordle/core/browser";
import initialSuggestionsData from "../../generated/initialSuggestions.json";
import { WordBadge } from "../../components/WordBadge";

const DICTIONARY_SET = new Set(VALID_SECRETS.map((w) => w.toLowerCase()));
const SOLVER_MODE: SolverMode = "full";
const INITIAL_RESPONSE: BotAnalysisResponse = {
  candidateCount: initialSuggestionsData.candidateCount,
  suggestions: initialSuggestionsData.suggestions.map((item) => ({
    ...item,
    isSecret: DICTIONARY_SET.has(item.word.toLowerCase()),
  })),
};

export default function BotPlaygroundPage() {
  const {
    rows,
    currentRowIndex,
    status,
    message,
    secret,
    commitGuess,
    resetGame,
  } = useGameEngine();

  const [history, setHistory] = useState<GuessHistoryEntry[]>([]);
  const [suggestions, setSuggestions] = useState<BotSuggestion[]>(
    INITIAL_RESPONSE.suggestions,
  );
  const [candidateCount, setCandidateCount] = useState<number | null>(
    INITIAL_RESPONSE.candidateCount,
  );
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretInput, setSecretInput] = useState(secret.toUpperCase());
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestionCacheRef = useRef<Map<string, BotAnalysisResponse>>(
    new Map([[SOLVER_MODE, INITIAL_RESPONSE]]),
  );

  useEffect(() => {
    setSecretInput(secret.toUpperCase());
  }, [secret]);

  const cacheKey = useMemo(() => {
    if (history.length === 0) return SOLVER_MODE;
    const signature = history
      .map((entry) => `${entry.guess}:${entry.pattern}`)
      .join("|");
    return `${SOLVER_MODE}|${signature}`;
  }, [history]);

  useEffect(() => {
    if (status !== "playing") {
      setSuggestions([]);
      if (status === "won") {
        setCandidateCount(1);
      } else if (status === "lost") {
        setCandidateCount(0);
      }
      return;
    }

    const cached = suggestionCacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached.suggestions);
      setCandidateCount(cached.candidateCount);
      return;
    }

    let cancelled = false;
    setCandidateCount(
      history.length === 0 ? INITIAL_RESPONSE.candidateCount : null,
    );
    startTransition(async () => {
      const response = await computeSuggestions(history, SOLVER_MODE, 10);
      if (!cancelled) {
        setSuggestions(response.suggestions);
        setCandidateCount(response.candidateCount);
        suggestionCacheRef.current.set(cacheKey, response);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, history, status]);

  const handleApplySuggestion = useCallback(
    (word: string) => {
      const result = commitGuess(word);
      if (result.ok) {
        setHistory((prev) => [
          ...prev,
          { guess: result.guess.toUpperCase(), pattern: result.pattern },
        ]);
      }
    },
    [commitGuess],
  );

  const handleRandomSecret = useCallback(() => {
    resetGame();
    setHistory([]);
    setSuggestions(INITIAL_RESPONSE.suggestions);
    setCandidateCount(INITIAL_RESPONSE.candidateCount);
    setSecretVisible(false);
    setSecretError(null);
  }, [resetGame]);

  const handleApplySecret = useCallback(() => {
    const normalized = secretInput.trim().toLowerCase();
    if (normalized.length !== WORD_LENGTH) {
      setSecretError(`Сөз ұзындығы ${WORD_LENGTH} болуы тиіс.`);
      return;
    }
    if (!DICTIONARY_SET.has(normalized)) {
      setSecretError("Сөз сөздікте жоқ.");
      return;
    }
    setSecretError(null);
    resetGame(normalized);
    setHistory([]);
    setSuggestions(INITIAL_RESPONSE.suggestions);
    setCandidateCount(INITIAL_RESPONSE.candidateCount);
  }, [resetGame, secretInput]);

  const committedHistory = useMemo<GuessHistoryEntry[]>(
    () => history,
    [history],
  );

  const topSuggestion = suggestions[0];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-white">
          Бот анализі · Энтропия визуализациясы
        </h2>
        <p className="text-sm text-white/60">
          Құпия сөзді таңдаңыз да, ақпараттық энтропияға сүйенген боттың
          қандай жорамал жасайтынын бақылаңыз.
        </p>
      </header>

      <SecretControls
        secret={secret}
        revealed={secretVisible}
        onToggleReveal={() => setSecretVisible((prev) => !prev)}
        inputValue={secretInput}
        onInputChange={(value) =>
          setSecretInput(
            value
              .replace(/[^A-Za-z\u0400-\u04FF]/g, "")
              .slice(0, WORD_LENGTH)
              .toUpperCase(),
          )
        }
        onApply={handleApplySecret}
        onRandom={handleRandomSecret}
        error={secretError}
        wordLength={WORD_LENGTH}
        disabled={status === "playing" && isPending}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs uppercase tracking-[0.3rem] text-white/50">
          Solver Mode · Full Search
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs uppercase tracking-wide",
              status === "playing"
                ? "bg-white/15 text-white/80"
                : "bg-emerald-400/20 text-emerald-200",
            )}
          >
            {status === "playing"
              ? "Ойын жүруде"
              : status === "won"
                ? "Шешілді"
                : "Бітті"}
          </span>
          {message && <span className="text-white/80">{message}</span>}
        </div>
      </div>

      <section className="flex flex-col gap-6">
        <GameBoard
          rows={rows}
          activeRowIndex={currentRowIndex}
          status={status}
          message={message}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-white/60">
            Соңғы энтропия ұсынысын қолдану:
          </span>
          <div className="flex items-center gap-3">
            {topSuggestion && (
              <WordBadge isSecret={topSuggestion.isSecret} variant="compact" />
            )}
            <button
              type="button"
              className={cn(
                "rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-white/80",
                (!topSuggestion || status !== "playing" || isPending) &&
                  "cursor-not-allowed bg-white/30 text-black/50 hover:bg-white/30",
              )}
              onClick={() => topSuggestion && handleApplySuggestion(topSuggestion.word)}
              disabled={!topSuggestion || status !== "playing" || isPending}
            >
              {topSuggestion ? `${topSuggestion.word.toUpperCase()}` : "—"}
            </button>
          </div>
        </div>
      </section>

      <SuggestionList
        suggestions={suggestions}
        candidateCount={candidateCount}
        loading={isPending}
        onApply={handleApplySuggestion}
        disabled={status !== "playing" || isPending}
      />

      <HistoryTimeline history={committedHistory} wordLength={WORD_LENGTH} />
    </div>
  );
}

