import { PatternCache } from "./pattern.js";

export function entropyForGuessRow(
  row: Uint16Array,
  candidateIdx: number[]
): number {
  // Count pattern frequencies
  const counts = new Map<number, number>();
  for (const t of candidateIdx) {
    const code = row[t];
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const n = candidateIdx.length;
  let H = 0;
  for (const c of counts.values()) {
    const p = c / n;
    H -= p * Math.log2(p);
  }
  return H;
}

export function entropyForGuess(
  guess: string,
  cache: PatternCache,
  candidateIdx: number[],
  force: boolean
): number {
  const row = cache.getRow(guess, force);
  return entropyForGuessRow(row, candidateIdx);
}