#!/usr/bin/env node
/// <reference types="node" />

import { mkdirSync } from "node:fs";
import { cpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VALID_GUESSES,
  VALID_SECRETS,
  WORD_LENGTH,
  HardcoreSolver,
  FullEntropySolver,
  feedbackCode,
  humanPattern,
  dictionarySignature,
  filterWordIndices,
  createPatternCacheProvider,
  type Solver,
  type SolverContext,
  type SolverHistoryEntry,
} from "../dist/lib/index.js";

type Mode = "full" | "hardcore";

interface CLIOptions {
  mode: Mode;
  cacheDir: string;
  maxWorkers: number;
  limit?: number;
  start: number;
  recompute: boolean;
}

type StaticSolverContext = Omit<
  SolverContext,
  "candidateAnswerIndices" | "candidateGuessIndices"
>;

interface TurnLog {
  turn: number;
  guess: string;
  entropy: number;
  patternCode: number;
  patternEmoji: string;
  patternDigits: string;
  candidatesBefore: number;
  candidatesAfter: number;
}

interface SecretResult {
  secret: string;
  turns: TurnLog[];
  success: boolean;
  rounds: number;
  failureReason?: string;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "y", "on"].includes(value.toLowerCase());
}

function parseArgs(): CLIOptions {
  const args = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    const eqIdx = body.indexOf("=");
    if (eqIdx === -1) {
      args.set(body, "true");
    } else {
      const key = body.slice(0, eqIdx);
      const value = body.slice(eqIdx + 1);
      if (key) args.set(key, value);
    }
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const defaultCacheDir = path.join(repoRoot, "packages", "core", "cache");

  const rawMode = (args.get("mode") ?? "hardcore").toLowerCase();
  const normalizedMode = rawMode === "hardcode" ? "hardcore" : rawMode;
  const mode: Mode = normalizedMode === "full" ? "full" : "hardcore";

  const cacheDirRaw = args.get("cacheDir") ?? defaultCacheDir;
  const cacheDir = path.isAbsolute(cacheDirRaw)
    ? cacheDirRaw
    : path.resolve(process.cwd(), cacheDirRaw);

  const maxWorkersRaw = args.get("maxWorkers");
  const parsedWorkers = maxWorkersRaw ? Number(maxWorkersRaw) : 1;
  const maxWorkers =
    Number.isFinite(parsedWorkers) && parsedWorkers > 0
      ? Math.floor(parsedWorkers)
      : 1;

  const limitRaw = args.get("limit");
  const parsedLimit = limitRaw ? Number(limitRaw) : undefined;
  const limit =
    parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.floor(parsedLimit)
      : undefined;

  const startRaw = args.get("start");
  const parsedStart = startRaw ? Number(startRaw) : 0;
  const start =
    Number.isFinite(parsedStart) && parsedStart >= 0
      ? Math.floor(parsedStart)
      : 0;

  const recompute = parseBoolean(args.get("recompute"));

  return {
    mode,
    cacheDir,
    maxWorkers,
    limit,
    start,
    recompute,
  };
}

async function simulateSecret(
  secret: string,
  solver: Solver,
  staticContext: StaticSolverContext,
  maxTurns: number
): Promise<SecretResult> {
  const history: SolverHistoryEntry[] = [];
  let candidateAnswerIndices = [...staticContext.answerIndices];
  const turns: TurnLog[] = [];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const candidateGuessIndices = filterWordIndices(
      staticContext.guessWords,
      history,
      feedbackCode
    );

    const ctx: SolverContext = {
      ...staticContext,
      candidateAnswerIndices,
      candidateGuessIndices,
    };

    const { guessIndex, entropy } = await solver.nextGuess(ctx);
    if (guessIndex < 0) {
      return {
        secret,
        turns,
        success: false,
        rounds: turn - 1,
        failureReason: "Solver failed to produce a guess.",
      };
    }

    const guess = staticContext.guessWords[guessIndex];
    const patternCode = feedbackCode(guess, secret);
    const patternEmoji = humanPattern(patternCode, WORD_LENGTH);
    const patternDigits = patternCode.toString(3).padStart(WORD_LENGTH, "0");
    const candidatesBefore = candidateAnswerIndices.length;

    history.push({ guess, pattern: patternCode });
    candidateAnswerIndices = filterWordIndices(
      staticContext.answerWords,
      history,
      feedbackCode
    );
    const candidatesAfter = candidateAnswerIndices.length;

    turns.push({
      turn,
      guess,
      entropy,
      patternCode,
      patternEmoji,
      patternDigits,
      candidatesBefore,
      candidatesAfter,
    });

    const solvedByGuess = guess === secret;
    const solvedByElimination =
      !solvedByGuess &&
      candidateAnswerIndices.length === 1 &&
      staticContext.answerWords[candidateAnswerIndices[0]] === secret;

    // Success only if guessed; elimination counts as needing one extra turn.
    if (solvedByGuess) {
      return {
        secret,
        turns,
        success: true,
        rounds: turn,
      };
    }

    if (solvedByElimination) {
      return {
        secret,
        turns,
        success: true,
        rounds: turn + 1,
      };
    }

    if (candidateAnswerIndices.length === 0) {
      return {
        secret,
        turns,
        success: false,
        rounds: turn,
        failureReason: "Candidate pool emptied unexpectedly.",
      };
    }
  }

  return {
    secret,
    turns,
    success: false,
    rounds: turns.length,
    failureReason: `Exceeded maximum of ${maxTurns} turns.`,
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const startTime = Date.now();

  mkdirSync(options.cacheDir, { recursive: true });
  mkdirSync(path.join(options.cacheDir, "patterns"), { recursive: true });

  const guessWords = VALID_GUESSES.map((word) => word.toLowerCase());
  const answerWords = VALID_SECRETS.map((word) => word.toLowerCase());
  const guessIndices = guessWords.map((_, idx) => idx);
  const answerIndices = answerWords.map((_, idx) => idx);
  const guessIndexByWord = new Map<string, number>(
    guessWords.map((word, idx) => [word, idx])
  );
  const answerIndexByWord = new Map<string, number>(
    answerWords.map((word, idx) => [word, idx])
  );

  const dictionaryHash = dictionarySignature(guessWords, answerWords);
  const patternDir = path.join(options.cacheDir, "patterns");
  const sharedPatternProvider = createPatternCacheProvider(
    answerWords,
    dictionaryHash,
    patternDir
  );
  const patternProviderFactory = () => sharedPatternProvider;

  const staticContext: StaticSolverContext = {
    guessWords,
    answerWords,
    guessIndices,
    answerIndices,
    guessIndexByWord,
    answerIndexByWord,
    dictionaryHash,
    length: WORD_LENGTH,
    recompute: options.recompute,
    maxWorkers: options.maxWorkers,
    cacheDir: options.cacheDir,
    patternDir,
    patternProviderFactory,
  };

  const solver: Solver =
    options.mode === "hardcore" ? new HardcoreSolver() : new FullEntropySolver();

  const totalSecrets = answerWords.length;
  const startIndex = Math.min(options.start, totalSecrets);
  const endExclusive = options.limit
    ? Math.min(totalSecrets, startIndex + options.limit)
    : totalSecrets;

  if (startIndex >= endExclusive) {
    console.warn(
      `[simulate] Nothing to do (start=${options.start}, limit=${options.limit ?? "∞"})`
    );
    return;
  }

  console.log("=== Wordle Auto Simulation ===");
  console.log(`Mode: ${solver.name()}`);
  console.log(
    `Secrets: processing indices ${startIndex}..${endExclusive - 1} of ${totalSecrets}`
  );
  console.log(
    `Cache dir: ${options.cacheDir} (recompute=${options.recompute ? "yes" : "no"})`
  );
  console.log(`Max workers: ${options.maxWorkers}`);

  const distribution = new Map<number, number>();
  const failures: SecretResult[] = [];
  let solvedCount = 0;
  let totalRounds = 0;
  let longestSolve = 0;
  let longestSecret: string | null = null;

  const maxTurns = WORD_LENGTH + 3;

  for (let idx = startIndex; idx < endExclusive; idx++) {
    const secret = answerWords[idx];
    const header = `[${idx + 1}/${totalSecrets}] Secret: ${secret.toUpperCase()}`;
    console.log(`\n=== ${header} ===`);

    const result = await simulateSecret(secret, solver, staticContext, maxTurns);

    for (const turn of result.turns) {
      const entropyStr =
        Number.isFinite(turn.entropy) && turn.entropy >= 0
          ? turn.entropy.toFixed(3)
          : "n/a";
      console.log(
        `Turn ${turn.turn}: ${turn.guess.toUpperCase()} | entropy=${entropyStr} | pattern=${turn.patternEmoji} (${turn.patternDigits}) | candidates ${turn.candidatesBefore} -> ${turn.candidatesAfter}`
      );
    }

    if (result.success) {
      solvedCount++;
      totalRounds += result.rounds;
      if (result.rounds >= longestSolve) {
        longestSolve = result.rounds;
        longestSecret = secret;
      }
      const prev = distribution.get(result.rounds) ?? 0;
      distribution.set(result.rounds, prev + 1);
      console.log(
        `✅ Solved in ${result.rounds} turn${result.rounds === 1 ? "" : "s"}`
      );
    } else {
      failures.push(result);
      console.log(
        `❌ Failed after ${result.rounds} turn${result.rounds === 1 ? "" : "s"}: ${result.failureReason ?? "unknown reason"}`
      );
    }
  }

  const elapsedMs = Date.now() - startTime;
  console.log("\n=== Simulation Summary ===");
  console.log(`Solver: ${solver.name()}`);
  console.log(`Secrets processed: ${endExclusive - startIndex}`);
  console.log(`Solved: ${solvedCount}`);
  console.log(`Failures: ${failures.length}`);
  if (solvedCount > 0) {
    console.log(`Average turns: ${(totalRounds / solvedCount).toFixed(3)}`);
    if (longestSecret) {
      console.log(
        `Longest solve: ${longestSolve} turn${longestSolve === 1 ? "" : "s"} (${longestSecret.toUpperCase()})`
      );
    }
  }
  const sortedDistribution = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
  if (sortedDistribution.length > 0) {
    console.log("\nRound distribution:");
    for (const [rounds, count] of sortedDistribution) {
      console.log(`  ${rounds} turn${rounds === 1 ? "" : "s"}: ${count}`);
    }
  } else {
    console.log("\nRound distribution: (no successful solves)");
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(`  ${failure.secret.toUpperCase()} -> ${failure.failureReason ?? "unknown reason"}`);
    }
  }

  console.log(`\nElapsed time: ${(elapsedMs / 1000).toFixed(2)}s`);
}

main().catch((err) => {
  console.error("[simulate] Unexpected error");
  console.error(err);
  process.exit(1);
});