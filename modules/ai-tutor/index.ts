import "server-only";

let _registered = false;

export function registerAiTutorModule(): void {
  if (_registered) return;
  _registered = true;

  // ai-tutor is primarily an event producer, not a consumer.
  // Add inbound event subscriptions here if needed in the future
  // (e.g., subscription_cancelled → reset quotas).
}

// Public API surface — consumers import ONLY from "@/modules/ai-tutor"
export { generateHint } from "@/modules/ai-tutor/services/generate-hint";
export type { GenerateHintResult } from "@/modules/ai-tutor/contracts/generate-hint";
