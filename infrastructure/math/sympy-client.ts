import "server-only";

import { getSympyServiceUrl } from "@/config/env.server";

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
  const response = await fetch(`${getSympyServiceUrl()}/evaluate`, {
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
    return getSympyServiceUrl();
  },
  evaluate
};
