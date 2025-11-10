import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function dictionarySignature(
  guessWords: string[],
  answerWords: string[],
): string {
  return sha256(
    JSON.stringify({
      guessCount: guessWords.length,
      answerCount: answerWords.length,
      guesses: guessWords,
      answers: answerWords,
    }),
  );
}

export function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

export function writeAtomic(file: string, buf: Buffer) {
  const tmp = file + ".tmp";
  writeFileSync(tmp, buf);
  renameSync(tmp, file);
}
