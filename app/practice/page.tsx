"use client";

import { useState } from "react";
import { startPracticeFlowAction, submitPracticeStepAction } from "./actions";
import type { StartPracticeResult, SubmitStepResult } from "@/modules/practice/contracts/practice";

type PracticeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: StartPracticeResult }
  | { status: "submitting"; data: StartPracticeResult }
  | { status: "error"; message: string };

export default function PracticePage() {
  const [state, setState] = useState<PracticeState>({ status: "idle" });
  const [steps, setSteps] = useState<SubmitStepResult[]>([]);
  const [inputValue, setInputValue] = useState("");

  async function handleStart() {
    setState({ status: "loading" });
    try {
      const result = await startPracticeFlowAction(null); // null topic for Phase 3
      setState({ status: "ready", data: result });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to start" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "ready" || !inputValue.trim()) return;

    setState({ ...state, status: "submitting" });
    try {
      const result = await submitPracticeStepAction(state.data.attemptId, inputValue);
      setSteps(prev => [...prev, result]);
      setInputValue("");
      setState({ status: "ready", data: state.data });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to submit" });
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Algebra Practice</h1>

      {state.status === "idle" && (
        <button
          onClick={handleStart}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start Practice Session
        </button>
      )}

      {state.status === "loading" && (
        <p className="text-gray-600">Starting session...</p>
      )}

      {(state.status === "ready" || state.status === "submitting") && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="font-medium">Problem: 2x + 4 = 10</p>
            <p className="text-sm text-gray-600">Solve for x step by step</p>
          </div>

          {steps.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Your Steps:</h3>
              {steps.map((step, idx) => (
                <div key={step.stepId} className="p-3 bg-green-50 border border-green-200 rounded">
                  <span className="text-sm text-gray-600">Step {idx + 1}: </span>
                  <span className="font-mono">{step.stepLatex}</span>
                  {step.isValid && <span className="ml-2 text-green-600">✓</span>}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your step (e.g., 2x = 6)"
              className="flex-1 px-4 py-2 border rounded-lg"
              disabled={state.status === "submitting"}
            />
            <button
              type="submit"
              disabled={state.status === "submitting" || !inputValue.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {state.status === "submitting" ? "Submitting..." : "Submit Step"}
            </button>
          </form>
        </div>
      )}

      {state.status === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{state.message}</p>
          <button
            onClick={() => setState({ status: "idle" })}
            className="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
