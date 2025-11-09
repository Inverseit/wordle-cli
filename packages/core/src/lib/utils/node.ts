import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

export function writeAtomic(file: string, buf: Buffer) {
  const tmp = file + ".tmp";
  writeFileSync(tmp, buf);
  renameSync(tmp, file);
}

export function binPathForGuess(guess: string, patternDir: string, hash: string) {
  const safe = guess.replace(/[^a-z]/g, "_");
  return path.join(patternDir, `${safe}.${hash}.bin`);
}

