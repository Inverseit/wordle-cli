"use client";

import { useEffect } from "react";
import { cn } from "../lib/cn";
import {
  KAZAKH_KEYBOARD_ROWS,
  type KeyboardKey,
} from "../lib/constants";
import type { KeyboardState } from "../lib/types";

interface KazakhKeyboardProps {
  keyboard: KeyboardState;
  onKeyPress: (key: KeyboardKey) => void;
  disabled?: boolean;
}

export function KazakhKeyboard({
  keyboard,
  onKeyPress,
  disabled = false,
}: KazakhKeyboardProps) {
  useEffect(() => {
    if (disabled) return;
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "enter") {
        onKeyPress("enter");
        event.preventDefault();
        return;
      }
      if (key === "backspace") {
        onKeyPress("backspace");
        event.preventDefault();
        return;
      }
      if (/^[\p{L}]$/u.test(key)) {
        onKeyPress(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, onKeyPress]);

  return (
    <div className="flex w-full flex-col gap-2">
      {KAZAKH_KEYBOARD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center gap-1">
          {row.map((keyValue) => {
            const value =
              typeof keyValue === "string" ? keyValue.toLowerCase() : keyValue;
            const label =
              keyValue === "enter"
                ? "Енгізу"
                : keyValue === "backspace"
                  ? "Жою"
                  : keyValue;
            const state =
              keyValue === "enter" || keyValue === "backspace"
                ? undefined
                : keyboard[value];
            const widthClass =
              keyValue === "enter" || keyValue === "backspace"
                ? "min-w-[72px] sm:min-w-[96px]"
                : "min-w-8 sm:min-w-9";
            return (
              <button
                key={keyValue.toString()}
                type="button"
                className={cn(
                  "keyboard-key rounded-md px-2 py-3 text-sm font-semibold uppercase transition",
                  widthClass,
                  disabled ? "opacity-60" : "active:translate-y-[1px]",
                )}
                data-state={state}
                onClick={() => onKeyPress(keyValue)}
                disabled={disabled}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

