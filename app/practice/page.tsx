"use client";

import { useState, type FormEvent } from "react";
import { startPracticeFlowAction, submitPracticeStepAction } from "./actions";
import type { StartPracticeResult, SubmitStepResult } from "@/modules/practice";

type PracticeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: StartPracticeResult }
  | { status: "submitting"; data: StartPracticeResult }
  | { status: "error"; message: string };

function IdleView({ onStart }: { onStart: () => void }) {
  return (
    <button
      onClick={onStart}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Start Practice Session
    </button>
  );
}

function LoadingView() {
  return <p className="text-gray-600">Starting session...</p>;
}

type PracticeViewProps = {
  isSubmitting: boolean;
  steps: SubmitStepResult[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
};

function PracticeView({ isSubmitting, steps, inputValue, onInputChange, onSubmit }: PracticeViewProps) {
  return (
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

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Enter your step (e.g., 2x = 6)"
          className="flex-1 px-4 py-2 border rounded-lg"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !inputValue.trim()}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Step"}
        </button>
      </form>
    </div>
  );
}

type ErrorViewProps = {
  message: string;
  onRetry: () => void;
};

function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Try Again
      </button>
    </div>
  );
}

export default function PracticePage() {
  const [state, setState] = useState<PracticeState>({ status: "idle" });
  const [steps, setSteps] = useState<SubmitStepResult[]>([]);
  const [inputValue, setInputValue] = useState("");

  const isReady = state.status === "ready";
  const isSubmitting = state.status === "submitting";
  const canSubmit = isReady && inputValue.trim().length > 0;

  async function handleStart() {
    setSteps([]);
    setInputValue("");
    setState({ status: "loading" });
    try {
      const result = await startPracticeFlowAction(null);
      setState({ status: "ready", data: result });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to start" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setState({ ...state, status: "submitting" });
    try {
      const result = await submitPracticeStepAction(state.data.attemptId, inputValue);
      setSteps((prev) => [...prev, result]);
      setInputValue("");
      setState({ status: "ready", data: state.data });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to submit" });
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Algebra Practice</h1>

      {state.status === "idle" && <IdleView onStart={handleStart} />}
      {state.status === "loading" && <LoadingView />}
      {(isReady || isSubmitting) && (
        <PracticeView
          isSubmitting={isSubmitting}
          steps={steps}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
        />
      )}
      {state.status === "error" && (
        <ErrorView message={state.message} onRetry={() => setState({ status: "idle" })} />
      )}
    </div>
  );
}
