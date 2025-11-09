"use client";

import { cn } from "../lib/cn";
import type { GuessSnapshot } from "../lib/types";
import { Tile } from "./Tile";

interface WordRowProps {
  guess: GuessSnapshot;
  isActive: boolean;
}

export function WordRow({ guess, isActive }: WordRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-1 sm:gap-2",
        guess.invalid ? "animate-shake" : "",
      )}
      role="group"
      aria-live={isActive ? "polite" : "off"}
    >
      {guess.tiles.map((tile, idx) => (
        <Tile key={idx} tile={tile} />
      ))}
    </div>
  );
}

