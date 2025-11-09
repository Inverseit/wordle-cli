import { existsSync, readFileSync } from "node:fs";
import { ensureDir, binPathForGuess, writeAtomic } from "./utils/node.js";
import { DEFAULT_PATTERN_DIR } from "./config.js";
import { feedbackCode } from "./feedback.js";

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