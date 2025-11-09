import { BaseSolver } from "./BaseSolver.js";
import { SolverContext } from "../types.js";

export class HardcoreSolver extends BaseSolver {
  // Only guess from current candidate set
  protected guessUniverse(ctx: SolverContext): number[] {
    return ctx.candidateIndices;
  }
}