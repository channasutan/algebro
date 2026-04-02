import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

vi.mock("../../[sessionId]/actions", () => ({
  generateHintAction: vi.fn()
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: vi.fn()
  };
});

import { HintPanel } from "../hint-panel";
import type { GenerateHintResult } from "@/modules/ai-tutor/contracts/generate-hint";

function renderWithState(state: GenerateHintResult | null, isPending: boolean): string {
  const formAction = vi.fn();
  vi.mocked(React.useActionState).mockReturnValue([
    state,
    formAction,
    isPending
  ] as ReturnType<typeof React.useActionState>);

  return renderToStaticMarkup(<HintPanel attemptId="attempt-1" stepIndex={0} />);
}

describe("HintPanel", () => {
  it("idle: renders get hint button enabled", () => {
    const html = renderWithState(null, false);
    expect(html).toContain("Get a hint");
    expect(html).not.toContain("disabled");
  });

  it("pending: disables button and shows loading indicator", () => {
    const html = renderWithState(null, true);
    expect(html).toContain("Getting hint...");
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
  });

  it("hint displayed: renders hint content", () => {
    const html = renderWithState({ success: true, hint: "Try factoring the expression." }, false);
    expect(html).toContain("Try factoring the expression.");
    expect(html).toContain('aria-label="Hint"');
  });

  it("quota_exceeded: shows remaining zero and upgrade cta", () => {
    const html = renderWithState(
      { success: false, reason: "quota_exceeded", remaining: 0 } as GenerateHintResult,
      false
    );
    expect(html).toContain("0 hints remaining");
    expect(html).toContain("Upgrade to premium");
  });

  it("ai_unavailable and validation_error: shows user-friendly retry message", () => {
    const unavailable = renderWithState({ success: false, reason: "ai_unavailable" }, false);
    const validation = renderWithState({ success: false, reason: "validation_error" }, false);

    expect(unavailable).toContain("Something went wrong. Please try again.");
    expect(validation).toContain("Something went wrong. Please try again.");
    expect(unavailable).not.toContain("ai_unavailable");
    expect(validation).not.toContain("validation_error");
  });
});
