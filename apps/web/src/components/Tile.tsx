"use client";

import type { KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import type { TileSnapshot } from "../lib/types";

interface TileProps {
  tile: TileSnapshot;
  onClick?: () => void;
  interactive?: boolean;
  disableAnimations?: boolean;
  ariaLabel?: string;
}

export function Tile({
  tile,
  onClick,
  interactive = false,
  disableAnimations = false,
  ariaLabel,
}: TileProps) {
  const { letter, state, flipDelay } = tile;
  const shouldAnimate =
    !disableAnimations &&
    (state === "correct" || state === "present" || state === "absent");
  const animationClass = shouldAnimate
    ? "animate-flip"
    : !disableAnimations && letter
      ? "animate-pop"
      : "";

  const style =
    flipDelay !== undefined && !disableAnimations
      ? { animationDelay: `${flipDelay}ms` }
      : undefined;

  const role = interactive ? "button" : "gridcell";
  const tabIndex = interactive ? 0 : undefined;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "tile flex h-14 w-14 items-center justify-center text-2xl font-semibold uppercase transition-transform sm:h-16 sm:w-16 sm:text-3xl",
        interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60",
        animationClass,
      )}
      data-state={state}
      style={style}
      aria-live="polite"
      role={role}
      tabIndex={tabIndex}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      aria-label={interactive ? ariaLabel : undefined}
    >
      {letter}
    </div>
  );
}

