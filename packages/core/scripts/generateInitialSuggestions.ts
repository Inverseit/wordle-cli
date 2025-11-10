#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WORDS,
  WORD_LENGTH,
  sha256,
  HardcoreSolver,
  createPatternCacheProvider,
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
  const allWords = WORDS.map((w) => w.toLowerCase());
  const candidateIndices = allWords.map((_, idx) => idx);
  const allIndices = candidateIndices;
  const wordIndexByString = new Map<string, number>(
    allWords.map((word, idx) => [word, idx]),
  );
  const wordHash = sha256(
    JSON.stringify({ len: allWords.length, words: allWords }),
  );

  const solver = new HardcoreSolver();

  const providerFactory = () =>
    createPatternCacheProvider(allWords, wordHash, patternDir);

  const ctx: SolverContext = {
    allWords,
    allIndices,
    candidateIndices,
    wordIndexByString,
    wordHash,
    length: WORD_LENGTH,
    recompute: false,
    maxWorkers: 0,
    cacheDir,
    patternDir,
    patternProviderFactory: providerFactory,
  };

  const evaluations = await solver.topGuesses(ctx, limit);

  const payload = {
    candidateCount: candidateIndices.length,
    suggestions: evaluations.map((item) => ({
      word: allWords[item.guessIndex],
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

