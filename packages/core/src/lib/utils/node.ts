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

export function binPathForGuess(
  guess: string,
  patternDir: string,
  dictionaryHash: string
) {
  const guessHash = sha256(`guess:${guess}`);
  const dictDir = path.join(
    patternDir,
    dictionaryHash.slice(0, 2),
    dictionaryHash
  );
  const guessDir = path.join(dictDir, guessHash.slice(0, 2));
  ensureDir(guessDir);
  return path.join(guessDir, `${guessHash}.bin`);
}

