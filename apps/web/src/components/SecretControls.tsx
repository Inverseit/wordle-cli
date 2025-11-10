"use client";

import { useMemo } from "react";

interface SecretControlsProps {
  secret: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onRandom: () => void;
  onReset: () => void;
  wordLength: number;
}

export function SecretControls({
  secret,
  revealed,
  onToggleReveal,
  onRandom,
  onReset,
  wordLength,
}: SecretControlsProps) {
  const maskedSecret = useMemo(() => {
    if (revealed) return secret.toUpperCase();
    return Array.from({ length: wordLength })
      .map(() => "•")
      .join("");
  }, [revealed, secret, wordLength]);

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/40">
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
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          onClick={onToggleReveal}
        >
          {revealed ? "Жасыру" : "Көрсету"}
        </button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/25"
          onClick={onRandom}
        >
          Кездейсоқ
        </button>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
          onClick={onReset}
        >
          Қайта бастау
        </button>
      </div>
    </section>
  );
}

