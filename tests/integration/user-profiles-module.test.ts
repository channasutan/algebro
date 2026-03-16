import { describe, expect, it, vi, beforeEach } from "vitest";

import { createSupabaseProfileRepository } from "@/modules/user-profiles/repositories/supabase-profile-repository";
import { getCurrentProfile } from "@/modules/user-profiles/services/get-current-profile";
import { updateProfile } from "@/modules/user-profiles/services/update-profile";
import { eventBus } from "@/events/event-bus";
import { USER_PROFILE_INITIALIZED } from "@/modules/user-profiles/events/user-profile-initialized";
import { USER_PROFILE_UPDATED } from "@/modules/user-profiles/events/profile-updated";

import * as ServerClientAuth from "@/lib/supabase/server-client";

// Mock event bus
vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(true),
    subscribe: vi.fn(),
  },
}));

describe("User Profiles Module Integration", () => {
  const createMockSupabaseClient = () => {
    const maybeSingleMock = vi.fn();
    
    const chainable = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
    };

    const fromMock = vi.fn().mockReturnValue(chainable);

    return {
      from: fromMock,
      _mocks: {
        fromMock,
        selectMock: chainable.select,
        updateMock: chainable.update,
        upsertMock: chainable.upsert,
        eqMock: chainable.eq,
        maybeSingleMock,
      }
    };
  };

  type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
  });

  const getClient = async () => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient;

  it("lazy bootstrap fetches a non-existent profile and creates it", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // Call 1: findById (getCurrentProfile) -> returns null
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    // Call 2: findById (ensureProfileExists) -> returns null
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    // Call 3: insertProfile -> upserts
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({ data: { id: "user-123" }, error: null });
    // Call 4: requireById -> finds it
    const insertedProfile = {
      id: "user-123", email: "test@ex.com", display_name: null, avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({ data: insertedProfile, error: null });

    const result = await getCurrentProfile(repo, { userId: "user-123" });

    // Assert finding first
    expect((mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).eqMock).toHaveBeenCalledWith("id", "user-123");
    
    // Assert upsert arguments for DO NOTHING equivalent
    expect((mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).upsertMock).toHaveBeenCalledWith(
      { id: "user-123", email: null, timezone: "UTC" },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Ensure event is published
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: USER_PROFILE_INITIALIZED })
    );

    expect(result.userId).toBe("user-123");
  });

  it("updates a profile and validates RLS indirectly by ensuring equality check", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // Mock ensureProfileExists internal logic
    const existingProfile = {
      id: "user-123", email: "test@ex.com", display_name: "Old Name", avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    // ensureProfileExists calls findById
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({ data: existingProfile, error: null });
    
    // actual updateProfile call
    (mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).maybeSingleMock.mockResolvedValueOnce({
      data: { ...existingProfile, display_name: "New Name", timezone: "America/New_York", updated_at: "new-time" },
      error: null
    });

    const result = await updateProfile(repo, {
      userId: "user-123",
      changes: { displayName: "New Name", timezone: "America/New_York" }
    });

    // Assert update called
    expect((mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).updateMock).toHaveBeenCalledWith({
      display_name: "New Name",
      timezone: "America/New_York"
    });

    // Assert RLS-like equality restriction (mocking how the client sets up the query)
    expect((mockClient._mocks as Record<string, ReturnType<typeof vi.fn>>).eqMock).toHaveBeenCalledWith("id", "user-123");
    
    // Validate event
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: USER_PROFILE_UPDATED })
    );

    expect(result.profile.displayName).toBe("New Name");
  });
});
