"use client";

import { patternCodeToEvaluations } from "../lib/patternHelpers";
import type { GuessHistoryEntry } from "../lib/types";

interface HistoryTimelineProps {
  history: GuessHistoryEntry[];
  wordLength: number;
}

export function HistoryTimeline({
  history,
  wordLength,
}: HistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        Әзірше жүрістер жоқ. Бот жорамалдаған сайын мұнда тарих пайда болады.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
      <header className="text-xs uppercase tracking-[0.3rem] text-white/50">
        Жүрістер тарихы
      </header>
      <ol className="flex flex-col gap-2">
        {history.map((entry, idx) => {
          const evaluations = patternCodeToEvaluations(entry.pattern);
          return (
            <li
              key={`${entry.guess}-${idx}`}
              className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2 text-sm text-white"
            >
              <div className="flex items-center gap-3">
                <span className="text-white/40">{idx + 1}.</span>
                <span className="font-semibold uppercase tracking-wide">
                  {entry.guess}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {evaluations.slice(0, wordLength).map((state, tileIdx) => (
                  <span
                    key={tileIdx}
                    className="tile h-7 w-7 rounded-md"
                    data-state={state}
                    aria-hidden
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

