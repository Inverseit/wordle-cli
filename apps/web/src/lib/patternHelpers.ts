import { decodeBase3, WORD_LENGTH } from "./coreClient";
import type { TileEvaluation } from "./types";

export function patternCodeToEvaluations(code: number): TileEvaluation[] {
  const digits = decodeBase3(code, WORD_LENGTH);
  return digits.map((digit) => {
    if (digit === 2) return "correct";
    if (digit === 1) return "present";
    return "absent";
  });
}

