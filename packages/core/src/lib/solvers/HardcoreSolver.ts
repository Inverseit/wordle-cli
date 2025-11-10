import { BaseSolver } from "./BaseSolver.js";
import { SolverContext } from "../types.js";

export class HardcoreSolver extends BaseSolver {
  // Only guess from current candidate set
  protected guessUniverse(ctx: SolverContext): number[] {
    const seen = new Set<number>();
    const guesses: number[] = [];
    for (const answerIdx of ctx.candidateAnswerIndices) {
      const word = ctx.answerWords[answerIdx];
      const guessIdx = ctx.guessIndexByWord.get(word);
      if (guessIdx === undefined) {
        continue;
      }
      if (!seen.has(guessIdx)) {
        seen.add(guessIdx);
        guesses.push(guessIdx);
      }
    }
    return guesses;
  }
}