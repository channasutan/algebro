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

function getSympyTimeoutMs(): number {
  const rawTimeout = process.env.SYMPY_TIMEOUT_MS ?? "10000";
  const parsedTimeout = Number.parseInt(rawTimeout, 10);

  if (!Number.isFinite(parsedTimeout) || parsedTimeout <= 0) {
    return 10_000;
  }

  return parsedTimeout;
}

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
    // AbortSignal.timeout requires Node 18+ (CI uses Node 24)
    signal: input.signal ?? AbortSignal.timeout(getSympyTimeoutMs())
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
