import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock the event bus before any module under test is imported.
// The ai-tutor module currently has NO inbound subscriptions, so subscribe
// should never be called regardless of how many times registerAiTutorModule
// is invoked. If subscriptions are added in the future, this test will catch
// any accidental duplication.
vi.mock("@/events/event-bus", () => ({
  eventBus: {
    subscribe: vi.fn(),
    publish: vi.fn(),
  },
}));

describe("registerAiTutorModule — bootstrap idempotency", () => {
  beforeEach(() => {
    // Reset module registry so the _registered flag is cleared between tests.
    // Dynamic import() inside each test then gets a fresh module instance.
    vi.resetModules();
  });

  it("calling registerAiTutorModule twice does not duplicate event subscriptions", async () => {
    // Fresh import after vi.resetModules() gives us a clean _registered flag.
    const { registerAiTutorModule } = await import("../index");
    const { eventBus } = await import("@/events/event-bus");

    const subscribeSpy = vi.mocked(eventBus.subscribe);
    subscribeSpy.mockClear();

    // Register twice
    registerAiTutorModule();
    registerAiTutorModule();

    // ai-tutor module currently has no inbound subscriptions, so subscribe
    // must have been called 0 times (not 0 + 0 duplicated = still 0, but
    // crucially not called TWICE if subscriptions are ever added).
    // The invariant: call count must be ≤ 1 per unique subscription.
    expect(subscribeSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("calling registerAiTutorModule three times does not duplicate event subscriptions", async () => {
    const { registerAiTutorModule } = await import("../index");
    const { eventBus } = await import("@/events/event-bus");

    const subscribeSpy = vi.mocked(eventBus.subscribe);
    subscribeSpy.mockClear();

    registerAiTutorModule();
    registerAiTutorModule();
    registerAiTutorModule();

    // Same invariant regardless of call count: at most 1 subscribe call per subscription
    expect(subscribeSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("first call executes registration logic; subsequent calls return early", async () => {
    const { registerAiTutorModule } = await import("../index");
    const { eventBus } = await import("@/events/event-bus");

    const subscribeSpy = vi.mocked(eventBus.subscribe);
    const callCountAfterFirst = subscribeSpy.mock.calls.length;

    // First registration
    registerAiTutorModule();
    const afterFirst = subscribeSpy.mock.calls.length;

    // Second registration — must not increase subscribe call count
    registerAiTutorModule();
    const afterSecond = subscribeSpy.mock.calls.length;

    // Any subscriptions added on first call must NOT be added again on second call
    expect(afterSecond).toBe(afterFirst);
    // And the first call must not have added more than 1 subscription
    expect(afterFirst - callCountAfterFirst).toBeLessThanOrEqual(1);
  });
});