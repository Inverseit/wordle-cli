"use client";

import { useMemo } from "react";
import { cn } from "../lib/cn";
import type { BotSuggestion } from "../lib/types";
import { WordBadge } from "./WordBadge";

type SuggestionListMode = "apply" | "select";

interface SuggestionListProps {
  suggestions: BotSuggestion[];
  candidateCount: number | null;
  loading: boolean;
  mode?: SuggestionListMode;
  onApply?: (word: string) => void;
  onSelect?: (word: string) => void;
  selectedWord?: string | null;
  disabled?: boolean;
}

export function SuggestionList({
  suggestions,
  candidateCount,
  loading,
  mode = "apply",
  onApply,
  onSelect,
  selectedWord,
  disabled = false,
}: SuggestionListProps) {
  const hasSuggestions = suggestions.length > 0;
  const interactionDisabled = disabled || loading;
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => {
      const entropyDiff = b.entropy - a.entropy;
      if (entropyDiff !== 0) {
        return entropyDiff;
      }
      if (a.isSecret === b.isSecret) {
        return a.word.localeCompare(b.word);
      }
      return a.isSecret ? -1 : 1;
    });
  }, [suggestions]);

  return (
    <section className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
      <header className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
            Ұсыныстар
          </span>
          {loading && <span className="text-white/50">Есептелуде...</span>}
        </div>
        <span>
          Кандидаттар:{" "}
          <span className="font-semibold text-white">
            {candidateCount ?? "—"}
          </span>
        </span>
      </header>

      {!hasSuggestions ? (
        <p className="text-sm text-white/60">
          Әзірге ұсыныстар жоқ. Алдымен құпия сөзді орнатыңыз немесе жаңа раунд
          бастаңыз.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {sortedSuggestions.map((item, idx) => {
            const isTop = idx === 0;
            const isSelected = mode === "select" && selectedWord === item.word.toUpperCase();
            return (
              <li
                key={item.word}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm uppercase tracking-wide text-white transition",
                  mode === "select" && isSelected
                    ? "bg-white text-black shadow-lg shadow-white/40"
                    : isTop
                      ? "bg-white/20"
                      : "bg-white/10",
                )}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-white/40">{idx + 1}.</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{item.word}</span>
                    <WordBadge isSecret={item.isSecret} variant="compact" />
                  </div>
                  <span className="text-xs lowercase text-white/60">
                    {item.entropy.toFixed(2)} бит
                  </span>
                </div>
                {mode === "apply" ? (
                  <button
                    type="button"
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                      interactionDisabled
                        ? "cursor-not-allowed bg-white/20 text-white/60"
                        : "bg-white text-black hover:bg-white/80",
                    )}
                    onClick={() => onApply?.(item.word)}
                    disabled={interactionDisabled}
                  >
                    {isTop ? "Үздік жорамалды қолдану" : "Қолдану"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide",
                      interactionDisabled
                        ? "cursor-not-allowed bg-white/20 text-white/60"
                        : isSelected
                          ? "bg-emerald-300 text-black shadow-inner shadow-emerald-600/40"
                          : "bg-white text-black transition hover:bg-white/80",
                    )}
                    onClick={() => !interactionDisabled && onSelect?.(item.word)}
                    disabled={interactionDisabled}
                  >
                    {isSelected ? "Таңдалды" : "Таңдау"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

