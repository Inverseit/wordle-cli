"use client";

import type { BotSuggestion } from "../lib/types";
import { cn } from "../lib/cn";

interface SuggestionListProps {
  suggestions: BotSuggestion[];
  candidateCount: number | null;
  loading: boolean;
  onApply: (word: string) => void;
  disabled?: boolean;
}

export function SuggestionList({
  suggestions,
  candidateCount,
  loading,
  onApply,
  disabled = false,
}: SuggestionListProps) {
  const hasSuggestions = suggestions.length > 0;

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
          {suggestions.map((item, idx) => {
            const isTop = idx === 0;
            return (
              <li
                key={item.word}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm uppercase tracking-wide text-white transition",
                  isTop ? "bg-white/20" : "bg-white/10",
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-white/40">{idx + 1}.</span>
                  <span className="font-semibold">{item.word}</span>
                  <span className="text-xs lowercase text-white/60">
                    {item.entropy.toFixed(2)} бит
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
                    disabled
                      ? "cursor-not-allowed bg-white/20 text-white/60"
                      : "bg-white text-black hover:bg-white/80",
                  )}
                  onClick={() => onApply(item.word)}
                  disabled={disabled}
                >
                  {isTop ? "Үздік жорамалды қолдану" : "Қолдану"}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

