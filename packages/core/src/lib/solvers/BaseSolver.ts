import { Solver, SolverContext, GuessEval } from "../types.js";
import { entropyForGuess } from "../entropy.js";
import { PatternProvider } from "../patternProvider.js";
import { createPatternCacheProvider } from "../patternCacheProvider.js";
import { cpus } from "node:os";

export abstract class BaseSolver implements Solver {
  protected abstract guessUniverse(ctx: SolverContext): number[]; // indices used as guesses
  name(): string { return this.constructor.name; }

  async nextGuess(ctx: SolverContext): Promise<GuessEval> {
    const evaluations = await this.rankGuesses(ctx);
    return evaluations[0] ?? { guessIndex: -1, entropy: -1 };
  }

  async topGuesses(ctx: SolverContext, limit: number = 10): Promise<GuessEval[]> {
    const evaluations = await this.rankGuesses(ctx);
    return evaluations.slice(0, limit);
  }

  private async rankGuesses(ctx: SolverContext): Promise<GuessEval[]> {
    const guesses = this.guessUniverse(ctx);
    const maxWorkers = Math.max(1, Math.min(ctx.maxWorkers, cpus().length));
    const evaluations =
      maxWorkers === 1 || guesses.length < 128
        ? await this.singleThreadEval(ctx, guesses)
        : await this.parallelEval(ctx, guesses, maxWorkers);
    evaluations.sort((a, b) => b.entropy - a.entropy);
    return evaluations;
  }

  private providerFactory(ctx: SolverContext): () => PatternProvider {
    if (ctx.patternProviderFactory) {
      return ctx.patternProviderFactory;
    }
    const patternDir =
      ctx.patternDir ?? (ctx.cacheDir ? `${ctx.cacheDir}/patterns` : undefined);
    return () =>
      createPatternCacheProvider(ctx.answerWords, ctx.dictionaryHash, patternDir);
  }

  private async singleThreadEval(
    ctx: SolverContext,
    guessIdxs: number[]
  ): Promise<GuessEval[]> {
    const provider = this.providerFactory(ctx)();
    const results: GuessEval[] = [];
    for (const gi of guessIdxs) {
      const g = ctx.guessWords[gi];
      const entropy = entropyForGuess(
        g,
        provider,
        ctx.candidateAnswerIndices,
        ctx.recompute
      );
      results.push({ guessIndex: gi, entropy });
    }
    return results;
  }

  private async parallelEval(
    ctx: SolverContext,
    guessIdxs: number[],
    workers: number
  ): Promise<GuessEval[]> {
    const chunks: number[][] = [];
    const chunkSize = Math.ceil(guessIdxs.length / workers);
    for (let i = 0; i < guessIdxs.length; i += chunkSize) {
      chunks.push(guessIdxs.slice(i, i + chunkSize));
    }

    const providerFactory = this.providerFactory(ctx);
    const tasks = chunks.map(async (chunk): Promise<GuessEval[]> => {
      const provider = providerFactory();
      const chunkResults: GuessEval[] = [];
      for (const gi of chunk) {
        const g = ctx.guessWords[gi];
        const entropy = entropyForGuess(
          g,
          provider,
          ctx.candidateAnswerIndices,
          ctx.recompute
        );
        chunkResults.push({ guessIndex: gi, entropy });
      }
      return chunkResults;
    });

    const results = await Promise.all(tasks);
    return results.flat();
  }
}