import { Solver, SolverContext, GuessEval } from "../types.js";
import { PatternCache } from "../pattern.js";
import { entropyForGuess } from "../entropy.js";
import { cpus } from "node:os";

export abstract class BaseSolver implements Solver {
  protected abstract guessUniverse(ctx: SolverContext): number[]; // indices used as guesses
  name(): string { return this.constructor.name; }

  async nextGuess(ctx: SolverContext): Promise<GuessEval> {
    const guesses = this.guessUniverse(ctx);
    const maxWorkers = Math.max(1, Math.min(ctx.maxWorkers, cpus().length));

    // Use parallel async evaluation for better performance
    if (maxWorkers === 1 || guesses.length < 128) {
      return this.singleThreadEval(ctx, guesses);
    }
    return this.parallelEval(ctx, guesses, maxWorkers);
  }

  private async singleThreadEval(ctx: SolverContext, guessIdxs: number[]): Promise<GuessEval> {
    const patternDir = ctx.patternDir ?? (ctx.cacheDir ? `${ctx.cacheDir}/patterns` : undefined);
    const cache = new PatternCache(ctx.allWords, ctx.wordHash, patternDir);
    let best = { guessIndex: -1, entropy: -1 };
    for (const gi of guessIdxs) {
      const g = ctx.allWords[gi];
      const H = entropyForGuess(g, cache, ctx.candidateIndices, ctx.recompute);
      if (H > best.entropy) best = { guessIndex: gi, entropy: H };
    }
    return best;
  }

  private async parallelEval(ctx: SolverContext, guessIdxs: number[], workers: number): Promise<GuessEval> {
    // Chunk guesses for parallel processing
    const chunks: number[][] = [];
    const chunkSize = Math.ceil(guessIdxs.length / workers);
    for (let i = 0; i < guessIdxs.length; i += chunkSize) {
      chunks.push(guessIdxs.slice(i, i + chunkSize));
    }

    // Evaluate chunks in parallel using Promise.all() with async functions
    const patternDir = ctx.patternDir ?? (ctx.cacheDir ? `${ctx.cacheDir}/patterns` : undefined);
    const tasks = chunks.map(async (chunk): Promise<GuessEval> => {
      const cache = new PatternCache(ctx.allWords, ctx.wordHash, patternDir);
      let best = { guessIndex: -1, entropy: -1 };
      for (const gi of chunk) {
        const g = ctx.allWords[gi];
        const H = entropyForGuess(g, cache, ctx.candidateIndices, ctx.recompute);
        if (H > best.entropy) best = { guessIndex: gi, entropy: H };
      }
      return best;
    });

    const results = await Promise.all(tasks);
    let best = { guessIndex: -1, entropy: -1 };
    for (const r of results) {
      if (r.entropy > best.entropy) best = r;
    }
    return best;
  }
}