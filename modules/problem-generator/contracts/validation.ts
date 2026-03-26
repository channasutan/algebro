export type ValidateProblemInput = {
  problemLatex: string;
};
export type ValidateProblemResult =
  | {
      isSolvable: true;
      solutionRaw: unknown;
    }
  | {
      isSolvable: false;
      errorType: "unsolvable" | "parse_error" | "sympy_unavailable";
    };
