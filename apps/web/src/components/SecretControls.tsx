"use client";

import { useMemo } from "react";
import { cn } from "../lib/cn";

interface SecretControlsProps {
  secret: string;
  revealed: boolean;
  onToggleReveal: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onApply: () => void;
  onRandom: () => void;
  disabled?: boolean;
  error?: string | null;
  wordLength: number;
}

export function SecretControls({
  secret,
  revealed,
  onToggleReveal,
  inputValue,
  onInputChange,
  onApply,
  onRandom,
  disabled = false,
  error,
  wordLength,
}: SecretControlsProps) {
  const maskedSecret = useMemo(() => {
    if (revealed) return secret.toUpperCase();
    return Array.from({ length: wordLength })
      .map(() => "•")
      .join("");
  }, [revealed, secret, wordLength]);

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/40">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-white/50">
            Құпия сөз
          </p>
          <div className="text-2xl font-semibold tracking-widest text-white">
            {maskedSecret}
          </div>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10"
          onClick={onToggleReveal}
        >
          {revealed ? "Жасыру" : "Көрсету"}
        </button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          maxLength={wordLength}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm uppercase tracking-widest text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/30"
          placeholder="Сөзді енгізіңіз"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={cn(
              "rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-white/80",
              disabled && "cursor-not-allowed opacity-60",
            )}
            disabled={disabled}
            onClick={onApply}
          >
            Қолдану
          </button>
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/25"
            onClick={onRandom}
            disabled={disabled}
          >
            Кездейсоқ
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <p className="text-xs text-white/50">
          Сөз сөздікте болуы керек. Ұзындығы {wordLength} әріп.
        </p>
      )}
    </section>
  );
}

