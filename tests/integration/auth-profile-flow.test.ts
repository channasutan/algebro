import { describe, expect, it, vi, beforeEach } from "vitest";

import { eventBus } from "@/events/event-bus";
import { AUTH_USER_REGISTERED } from "@/modules/authentication/events/auth-user-registered";
import { handleAuthUserRegistered } from "@/modules/user-profiles/events/on-auth-user-registered";

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(true),
    subscribe: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/server-client", () => ({
  getSupabaseServerClient: vi.fn(),
}));

describe("Auth-to-Profile Cross-Module Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles the registered event to lazily bootstrap a profile", async () => {
    // We mock ensureProfileExists using the mocked repository
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(null),  // First call - no existing profile
      insertProfile: vi.fn().mockResolvedValue({ userId: "user-999", email: "test@ex.com" }),
      updateProfile: vi.fn(),
    };

    const handler = handleAuthUserRegistered(mockRepo);

    await handler({
      event_id: "test-event-id",
      event_type: AUTH_USER_REGISTERED,
      timestamp: new Date().toISOString(),
      payload: {
        userId: "user-999",
        email: "test@ex.com",
        registeredAt: new Date().toISOString(),
        source: "email",
      },
    });

    expect(mockRepo.findById).toHaveBeenCalledWith("user-999");
    expect(mockRepo.insertProfile).toHaveBeenCalledWith({
      id: "user-999",
      email: "test@ex.com",
      timezone: "UTC",
    });

    // insertProfile returns profile directly, no second findById needed
    expect(eventBus.publish).toHaveBeenCalled();
  });
});
