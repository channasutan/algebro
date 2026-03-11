import "server-only";

const DEFAULT_SYMPY_SERVICE_URL = process.env.SYMPY_SERVICE_URL ?? "http://127.0.0.1:8000";

export type SympyOperation = "simplify" | "expand" | "solve" | "equivalence";

export type SympyEvaluateInput = {
  expression: string;
  operation: SympyOperation;
  context?: Record<string, unknown>;
  signal?: AbortSignal;
};

export type SympyEvaluateResponse = {
  result: unknown;
};

async function evaluate(input: SympyEvaluateInput): Promise<SympyEvaluateResponse> {
  const response = await fetch(`${DEFAULT_SYMPY_SERVICE_URL}/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      expression: input.expression,
      operation: input.operation,
      context: input.context ?? {}
    }),
    signal: input.signal
  });

  if (!response.ok) {
    throw new Error(`SymPy request failed with status ${response.status}`);
  }

  return (await response.json()) as SympyEvaluateResponse;
}

export const sympyClient = {
  getBaseUrl(): string {
    return DEFAULT_SYMPY_SERVICE_URL;
  },
  evaluate
};
