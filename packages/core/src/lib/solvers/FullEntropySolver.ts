import { BaseSolver } from "./BaseSolver.js";
import { SolverContext } from "../types.js";

export class FullEntropySolver extends BaseSolver {
  // Guess from full allowed list (always-information mode)
  protected guessUniverse(ctx: SolverContext): number[] {
    return ctx.guessIndices;
  }
}