"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { GameBoard } from "../../components/GameBoard";
import { SecretControls } from "../../components/SecretControls";
import { SolverModeToggle } from "../../components/SolverModeToggle";
import { SuggestionList } from "../../components/SuggestionList";
import { HistoryTimeline } from "../../components/HistoryTimeline";
import { useGameEngine } from "../../hooks/useGameEngine";
import { computeSuggestions } from "./actions";
import { cn } from "../../lib/cn";
import type {
  BotSuggestion,
  GuessHistoryEntry,
  SolverMode,
} from "../../lib/types";
import { WORDS, WORD_LENGTH } from "@wordle/core/browser";

const TOTAL_WORDS = WORDS.length;
const DICTIONARY_SET = new Set(WORDS.map((w) => w.toLowerCase()));

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
  const [mode, setMode] = useState<SolverMode>("hardcore");
  const [suggestions, setSuggestions] = useState<BotSuggestion[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(TOTAL_WORDS);
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretInput, setSecretInput] = useState(secret.toUpperCase());
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSecretInput(secret.toUpperCase());
  }, [secret]);

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

    let cancelled = false;
    if (history.length === 0) {
      setCandidateCount(TOTAL_WORDS);
    } else {
      setCandidateCount(null);
    }
    startTransition(async () => {
      const response = await computeSuggestions(history, mode, 10);
      if (!cancelled) {
        setSuggestions(response.suggestions);
        setCandidateCount(response.candidateCount);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [history, mode, status]);

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
    setSuggestions([]);
    setCandidateCount(TOTAL_WORDS);
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
    setSuggestions([]);
    setCandidateCount(TOTAL_WORDS);
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
        <SolverModeToggle mode={mode} onChange={setMode} />
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

