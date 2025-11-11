"use client";

import type { GuessSnapshot } from "../lib/types";
import { WordRow } from "./WordRow";

interface GameBoardProps {
  rows: GuessSnapshot[];
  activeRowIndex: number;
  status: "playing" | "won" | "lost";
  message?: string | null;
  editableRowIndex?: number | null;
  onRowTileClick?: (rowIndex: number, tileIndex: number) => void;
}

export function GameBoard({
  rows,
  activeRowIndex,
  status,
  message,
  editableRowIndex = null,
  onRowTileClick,
}: GameBoardProps) {
  return (
    <section className="flex flex-col items-center gap-4">
      <div className="flex flex-col gap-1 sm:gap-2">
        {rows.map((row, idx) => (
          <WordRow
            key={idx}
            guess={row}
            isActive={idx === activeRowIndex}
            editable={editableRowIndex === idx}
            onTileClick={
              editableRowIndex === idx && onRowTileClick
                ? (tileIdx) => onRowTileClick(idx, tileIdx)
                : undefined
            }
            disableAnimations={editableRowIndex === idx}
          />
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

