#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  HardcoreSolver,
  createPatternCacheProvider,
  dictionarySignature,
  type SolverContext,
} from "../dist/lib/index.js";

interface CLIOptions {
  outputFile: string;
  limit: number;
  cacheDir: string;
}

function parseArgs(): CLIOptions {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const [key, value] = raw.split("=");
    if (key && value) args.set(key.replace(/^--/, ""), value);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, "..", "..", "..");

  const outputFile =
    args.get("output") ??
    path.join(
      repoRoot,
      "apps",
      "web",
      "src",
      "generated",
      "initialSuggestions.json",
    );

  const limit = Number(args.get("limit") ?? "10");

  const cacheDir =
    args.get("cacheDir") ??
    path.join(repoRoot, "apps", "web", "public", "cache");

  return {
    outputFile,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10,
    cacheDir,
  };
}

async function main() {
  const { outputFile, limit, cacheDir } = parseArgs();

  const patternDir = path.join(cacheDir, "patterns");
  const guessWords = VALID_GUESSES.map((w) => w.toLowerCase());
  const answerWords = VALID_SECRETS.map((w) => w.toLowerCase());
  const guessIndices = guessWords.map((_, idx) => idx);
  const answerIndices = answerWords.map((_, idx) => idx);
  const candidateAnswerIndices = [...answerIndices];
  const guessIndexByWord = new Map<string, number>(
    guessWords.map((word, idx) => [word, idx]),
  );
  const answerIndexByWord = new Map<string, number>(
    answerWords.map((word, idx) => [word, idx]),
  );
  const dictionaryHash = dictionarySignature(guessWords, answerWords);

  const solver = new HardcoreSolver();

  const providerFactory = () =>
    createPatternCacheProvider(answerWords, dictionaryHash, patternDir);

  const ctx: SolverContext = {
    guessWords,
    answerWords,
    guessIndices,
    answerIndices,
    candidateAnswerIndices,
    guessIndexByWord,
    answerIndexByWord,
    dictionaryHash,
    length: WORD_LENGTH,
    recompute: false,
    maxWorkers: 0,
    cacheDir,
    patternDir,
    patternProviderFactory: providerFactory,
  };

  const evaluations = await solver.topGuesses(ctx, limit);

  const payload = {
    candidateCount: candidateAnswerIndices.length,
    suggestions: evaluations.map((item) => ({
      word: guessWords[item.guessIndex],
      entropy: item.entropy,
    })),
  };

  mkdirSync(path.dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, JSON.stringify(payload, null, 2));
  console.log(`Initial suggestions written to ${outputFile}`);
}

main().catch((error) => {
  console.error("Failed to generate initial suggestions");
  console.error(error);
  process.exit(1);
});

