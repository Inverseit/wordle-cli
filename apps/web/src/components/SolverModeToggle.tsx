"use client";

import type { SolverMode } from "../lib/types";
import { cn } from "../lib/cn";

interface SolverModeToggleProps {
  mode: SolverMode;
  onChange: (mode: SolverMode) => void;
}

export function SolverModeToggle({ mode, onChange }: SolverModeToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/10 p-1 text-xs uppercase tracking-wide text-white shadow-inner shadow-black/30">
      {(
        [
          { value: "hardcore", label: "Hardcore" },
          { value: "full", label: "Full Entropy" },
        ] satisfies Array<{ value: SolverMode; label: string }>
      ).map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-full px-4 py-2 transition",
              active ? "bg-white text-black" : "text-white/70 hover:text-white",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

