"use client";

import type { GuessSnapshot } from "../lib/types";
import { WordRow } from "./WordRow";

interface GameBoardProps {
  rows: GuessSnapshot[];
  activeRowIndex: number;
  status: "playing" | "won" | "lost";
  message?: string | null;
}

export function GameBoard({
  rows,
  activeRowIndex,
  status,
  message,
}: GameBoardProps) {
  return (
    <section className="flex flex-col items-center gap-4">
      <div className="flex flex-col gap-1 sm:gap-2">
        {rows.map((row, idx) => (
          <WordRow key={idx} guess={row} isActive={idx === activeRowIndex} />
        ))}
      </div>
      <div className="text-sm text-white/70" role="status" aria-live="polite">
        {status === "won" && "Ойын аяқталды."}
        {status === "lost" && "Келесіге дайынсыз ба?"}
        {status === "playing" && message}
        {status !== "playing" && message}
      </div>
    </section>
  );
}

