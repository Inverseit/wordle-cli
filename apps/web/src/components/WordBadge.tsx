"use client";

import { cn } from "../lib/cn";

type WordBadgeVariant = "default" | "compact";

interface WordBadgeProps {
  isSecret: boolean;
  variant?: WordBadgeVariant;
  className?: string;
}

export function WordBadge({
  isSecret,
  variant = "default",
  className,
}: WordBadgeProps) {
  const baseStyles =
    variant === "compact"
      ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide"
      : "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide";

  const tone = isSecret
    ? "bg-emerald-400/15 text-emerald-100"
    : "bg-white/10 text-white/60";

  const label =
    variant === "compact"
      ? isSecret
        ? "Құпия"
        : "Жорамал"
      : isSecret
        ? "Құпия сөз"
        : "Жорамал сөз";

  return (
    <span className={cn(baseStyles, tone, className)}>
      <span
        aria-hidden
        className={cn(
          "h-2 w-2 rounded-full",
          isSecret ? "bg-emerald-300" : "bg-white/40",
        )}
      />
      {label}
    </span>
  );
}


