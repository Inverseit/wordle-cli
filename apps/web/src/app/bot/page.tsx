"use client";

import { useCallback } from "react";
import { WORDS } from "../../lib/coreClient";
import { GameBoard } from "../../components/GameBoard";
import { KazakhKeyboard } from "../../components/KazakhKeyboard";
import { SolverPanel } from "../../components/SolverPanel";
import { useGameEngine } from "../../hooks/useGameEngine";
import type { KeyboardKey } from "../../lib/constants";

const SAMPLE_WORDS = WORDS.slice(0, 32);

export default function BotPlaygroundPage() {
  const {
    rows,
    currentRowIndex,
    keyboard,
    status,
    message,
    secret,
    addLetter,
    removeLetter,
    submitGuess,
    resetGame,
  } = useGameEngine();

  const onKeyPress = useCallback(
    (key: KeyboardKey) => {
      if (key === "enter") {
        submitGuess();
        return;
      }
      if (key === "backspace") {
        removeLetter();
        return;
      }
      if (typeof key === "string") {
        addLetter(key);
      }
    },
    [addLetter, removeLetter, submitGuess],
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-white">
            Бот анализі (алдын ала)
          </h2>
          <p className="text-sm text-white/60">
            Құпия сөзді таңдап, бот қалай ойлайтынын бақылаңыз. Бұл бет әзірге
            тек интерфейсті көрсетеді — нақты есептеулер кейін қосылады.
          </p>
        </header>

        <div className="flex flex-col items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {SAMPLE_WORDS.slice(0, 10).map((word) => (
              <button
                key={word}
                type="button"
                className="rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white hover:bg-white/25"
                onClick={() => resetGame(word)}
              >
                {word}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10"
            onClick={() => resetGame()}
          >
            Кездейсоқ сөз
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-10">
        <GameBoard
          rows={rows}
          activeRowIndex={currentRowIndex}
          status={status}
          message={message}
        />
        <KazakhKeyboard
          keyboard={keyboard}
          onKeyPress={onKeyPress}
          disabled={status !== "playing"}
        />
      </div>

      <SolverPanel modeLabel="Энтропия логтары" candidateCount={undefined} />
    </div>
  );
}

