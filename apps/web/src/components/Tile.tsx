"use client";

import { cn } from "../lib/cn";
import type { TileSnapshot } from "../lib/types";

interface TileProps {
  tile: TileSnapshot;
}

export function Tile({ tile }: TileProps) {
  const { letter, state, flipDelay } = tile;
  const animationClass =
    state === "correct" || state === "present" || state === "absent"
      ? "animate-flip"
      : letter
        ? "animate-pop"
        : "";

  const style =
    flipDelay !== undefined
      ? { animationDelay: `${flipDelay}ms` }
      : undefined;

  return (
    <div
      className={cn(
        "tile flex h-14 w-14 items-center justify-center text-2xl font-semibold uppercase transition-transform sm:h-16 sm:w-16 sm:text-3xl",
        animationClass,
      )}
      data-state={state}
      style={style}
      aria-live="polite"
    >
      {letter}
    </div>
  );
}

