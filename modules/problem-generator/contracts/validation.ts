export type ValidateProblemInput = {
  problemLatex: string;
};
export type ValidateProblemResult = {
  isSolvable: boolean;
  errorType?: "unsolvable" | "parse_error" | "sympy_unavailable";
};
