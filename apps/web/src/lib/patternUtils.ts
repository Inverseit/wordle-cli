import type { TileEvaluation } from "./types";
import { WORD_LENGTH } from "@wordle/core/browser";

export function emptyPattern(length: number = WORD_LENGTH): TileEvaluation[] {
  return Array.from({ length }, () => "empty" as TileEvaluation);
}

const CYCLE_ORDER: TileEvaluation[] = ["empty", "absent", "present", "correct"];

export function cycleTileState(state: TileEvaluation): TileEvaluation {
  const index = CYCLE_ORDER.indexOf(state);
  if (index === -1) {
    return "absent";
  }
  const nextIndex = (index + 1) % CYCLE_ORDER.length;
  return CYCLE_ORDER[nextIndex];
}

export function tileEvaluationsToPatternCode(
  evaluations: TileEvaluation[],
): number {
  let code = 0;
  for (let i = 0; i < evaluations.length; i++) {
    code = code * 3 + tileEvaluationToDigit(evaluations[i]);
  }
  return code;
}

export function patternCodeToTileEvaluations(
  code: number,
  length: number,
): TileEvaluation[] {
  const digits: TileEvaluation[] = Array.from({ length }, () => "empty");
  for (let idx = length - 1; idx >= 0; idx--) {
    const digit = code % 3;
    code = Math.floor(code / 3);
    digits[idx] = digitToTileEvaluation(digit);
  }
  return digits;
}

function tileEvaluationToDigit(state: TileEvaluation): 0 | 1 | 2 {
  switch (state) {
    case "correct":
      return 2;
    case "present":
      return 1;
    case "absent":
    case "empty":
      return 0;
    default:
      return 0;
  }
}

function digitToTileEvaluation(digit: number): TileEvaluation {
  if (digit === 2) return "correct";
  if (digit === 1) return "present";
  return "absent";
}

export function isPatternComplete(evaluations: TileEvaluation[]): boolean {
  return evaluations.every((state) => state !== "empty");
}


