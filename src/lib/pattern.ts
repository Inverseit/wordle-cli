import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { ensureDir, binPathForGuess, writeAtomic, base3EncodePattern } from "./utils.js";
import { WORD_LENGTH, DEFAULT_PATTERN_DIR } from "./config.js";

// Compute feedback (greens first then yellows), with duplicate handling
export function feedbackCode(guess: string, target: string): number {
  const L = WORD_LENGTH;
  const res = new Array<number>(L).fill(0);
  const freq = new Map<string, number>();

  for (let i = 0; i < L; i++) {
    const ch = target[i];
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }

  // pass 1: greens
  for (let i = 0; i < L; i++) {
    if (guess[i] === target[i]) {
      res[i] = 2;
      freq.set(guess[i], (freq.get(guess[i]) ?? 0) - 1);
    }
  }
  // pass 2: yellows
  for (let i = 0; i < L; i++) {
    if (res[i] !== 0) continue;
    const g = guess[i];
    const count = freq.get(g) ?? 0;
    if (count > 0) {
      res[i] = 1;
      freq.set(g, count - 1);
    }
  }
  return base3EncodePattern(res);
}

export class PatternCache {
  constructor(
    private allWords: string[],
    private wordHash: string,
    private patternDir: string = DEFAULT_PATTERN_DIR
  ) {
    ensureDir(this.patternDir);
  }

  /** Load precomputed matrix row for a guess (codes per target index) or undefined. */
  tryLoad(guess: string): Uint16Array | undefined {
    const file = binPathForGuess(guess, this.patternDir, this.wordHash);
    if (!existsSync(file)) return undefined;
    const buf = readFileSync(file);
    if (buf.length !== this.allWords.length * 2) return undefined;
    return new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  }

  /** Generate and persist matrix row for guess. */
  generate(guess: string): Uint16Array {
    const n = this.allWords.length;
    const out = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = feedbackCode(guess, this.allWords[i]);
    }
    const file = binPathForGuess(guess, this.patternDir, this.wordHash);
    writeAtomic(file, Buffer.from(out.buffer));
    return out;
  }

  /** Get codes row, regenerating if missing or forced. */
  getRow(guess: string, force: boolean): Uint16Array {
    if (!force) {
      const row = this.tryLoad(guess);
      if (row) return row;
    }
    return this.generate(guess);
  }
}