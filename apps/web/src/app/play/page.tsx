"use client";

import { useCallback } from "react";
import { KazakhKeyboard } from "../../components/KazakhKeyboard";
import { GameBoard } from "../../components/GameBoard";
import { useGameEngine } from "../../hooks/useGameEngine";
import type { KeyboardKey } from "../../lib/constants";

export default function PlayPage() {
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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-semibold text-white">Жаңа ойын</h2>
        <GameBoard
          rows={rows}
          activeRowIndex={currentRowIndex}
          status={status}
          message={message}
        />
        <div className="flex items-center gap-3 text-xs text-white/50">
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-2 font-medium text-white transition hover:bg-white/25"
            onClick={() => resetGame()}
          >
            Жаңа сөз
          </button>
          {status !== "playing" ? (
            <span>
              Құпия сөз:{" "}
              <span className="font-semibold uppercase text-white">
                {secret}
              </span>
            </span>
          ) : null}
        </div>
      </section>

      <KazakhKeyboard
        keyboard={keyboard}
        onKeyPress={onKeyPress}
        disabled={status !== "playing"}
      />
    </div>
  );
}

