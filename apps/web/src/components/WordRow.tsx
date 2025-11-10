"use client";

import { cn } from "../lib/cn";
import type { GuessSnapshot } from "../lib/types";
import { Tile } from "./Tile";

interface WordRowProps {
  guess: GuessSnapshot;
  isActive: boolean;
  onTileClick?: (index: number) => void;
  editable?: boolean;
  disableAnimations?: boolean;
  className?: string;
}

export function WordRow({
  guess,
  isActive,
  onTileClick,
  editable = false,
  disableAnimations = false,
  className,
}: WordRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-1 sm:gap-2",
        guess.invalid ? "animate-shake" : "",
        className,
      )}
      role="group"
      aria-live={isActive ? "polite" : "off"}
    >
      {guess.tiles.map((tile, idx) => (
        <Tile
          key={idx}
          tile={tile}
          onClick={
            editable && onTileClick ? () => onTileClick(idx) : undefined
          }
          interactive={editable && !!onTileClick}
          disableAnimations={disableAnimations || !guess.committed}
          ariaLabel={
            editable
              ? `Ұяшық ${idx + 1} · ${tileStateLabel(tile.state)}`
              : undefined
          }
        />
      ))}
    </div>
  );
}

function tileStateLabel(state: GuessSnapshot["tiles"][number]["state"]): string {
  switch (state) {
    case "correct":
      return "дұрыс";
    case "present":
      return "басқа орында";
    case "absent":
      return "жоқ";
    case "editing":
      return "өңделуде";
    case "empty":
    default:
      return "бос";
  }
}

