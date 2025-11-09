"use client";

import { cn } from "../lib/cn";

export interface SolverSuggestion {
  word: string;
  entropy: number;
}

interface SolverPanelProps {
  candidateCount?: number;
  suggestions?: SolverSuggestion[];
  modeLabel?: string;
  hidden?: boolean;
}

export function SolverPanel({
  candidateCount,
  suggestions,
  modeLabel = "Энтропия талдауы",
  hidden = false,
}: SolverPanelProps) {
  if (hidden) return null;

  const topSuggestions = suggestions?.slice(0, 10) ?? [];

  return (
    <aside className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">
            Solver
          </p>
          <h2 className="text-lg font-semibold text-white">{modeLabel}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
          {candidateCount !== undefined
            ? `Кандидаттар: ${candidateCount}`
            : "Дайындалуда"}
        </span>
      </header>

      <div className="flex flex-col gap-3">
        {topSuggestions.length === 0 ? (
          <p className="text-sm text-white/60">
            Қазір ұсыныстар жоқ. Алдымен ботты іске қосыңыз немесе құпия сөзді
            таңдаңыз.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {topSuggestions.map((item, idx) => (
              <li
                key={item.word}
                className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                <span className="flex items-center gap-3 font-semibold uppercase tracking-wide">
                  <span className="text-white/40">{idx + 1}.</span>
                  {item.word}
                </span>
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <span
                    className={cn(
                      "flex h-1.5 w-24 overflow-hidden rounded-full bg-white/10",
                    )}
                  >
                    <span
                      className="bg-white"
                      style={{
                        width: `${Math.min(100, item.entropy * 12)}%`,
                      }}
                    />
                  </span>
                  <span>{item.entropy.toFixed(2)} бит</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

