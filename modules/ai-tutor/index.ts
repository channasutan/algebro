import "server-only";

// Idempotency guard — module-level flag prevents duplicate subscriptions
let _registered = false;

/**
 * Register the ai-tutor module's event subscriptions and internal wiring.
 * Safe to call multiple times — only the first call has any effect.
 *
 * Currently the ai-tutor module is a producer of events (AI_HINT_REQUESTED),
 * not a consumer. No inbound subscriptions are required at this time.
 * Add event subscriptions here if the module needs to react to billing or
 * practice events in the future (e.g. subscription_cancelled to reset quotas).
 */
export function registerAiTutorModule(): void {
  if (_registered) return;
  _registered = true;

  // No inbound event subscriptions required currently.
  // The module exposes generateHint() as its public API surface.
}

// Public API surface — consumers import ONLY from "@/modules/ai-tutor"
export { generateHint } from "@/modules/ai-tutor/services/generate-hint";
export type { GenerateHintResult } from "@/modules/ai-tutor/contracts/generate-hint";
