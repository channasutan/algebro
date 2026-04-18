import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock next/headers to prevent server-client crashes in Vitest
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { createSupabaseProfileRepository } from "@/modules/user-profiles/repositories/supabase-profile-repository";
import { getCurrentProfile, getOrCreateUserProfile, InitializationSource, ProfileNotFoundError } from "@/modules/user-profiles";
import { eventBus } from "@/events/event-bus";
import { USER_PROFILE_UPDATED } from "@/modules/user-profiles/events/profile-updated";

import * as ServerClientAuth from "@/lib/supabase/server-client";
import * as ServerClientAdmin from "@/lib/supabase/admin-client";
import { updateProfile } from "@/modules/user-profiles/services/update-profile";

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
    const singleMock = vi.fn();
    
    const chainable = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: maybeSingleMock,
      single: singleMock,
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
        singleMock,
      }
    };
  };

  type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
  let mockClient: MockSupabaseClient;
  const context = { requestId: "test-req" };

  // Cache references to internal mock functions for cleaner assertions
  let maybeSingleMock: ReturnType<typeof vi.fn>;
  let singleMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let upsertMock: ReturnType<typeof vi.fn>;
  let eqMock: ReturnType<typeof vi.fn>;
 
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    maybeSingleMock = mockClient._mocks.maybeSingleMock as ReturnType<typeof vi.fn>;
    singleMock = mockClient._mocks.singleMock as ReturnType<typeof vi.fn>;
    updateMock = mockClient._mocks.updateMock as ReturnType<typeof vi.fn>;
    upsertMock = mockClient._mocks.upsertMock as ReturnType<typeof vi.fn>;
    eqMock = mockClient._mocks.eqMock as ReturnType<typeof vi.fn>;
  });

  const getClient = async () => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient;

  it("returns null when profile not found", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // getCurrentProfile calls findById -> returns null
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    const result = await getCurrentProfile(repo, { userId: "user-123" });
    expect(result).toBeNull();
  });

  it("updates a profile and validates RLS indirectly by ensuring equality check", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    const existingProfile = {
      id: "user-123", email: "test@ex.com", display_name: "Old Name", avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    maybeSingleMock.mockResolvedValueOnce({ data: existingProfile, error: null });
    
    singleMock.mockResolvedValueOnce({
      data: { ...existingProfile, display_name: "New Name", timezone: "America/New_York", updated_at: "new-time" },
      error: null
    });

    const result = await updateProfile(repo, {
      userId: "user-123",
      changes: { displayName: "New Name", timezone: "America/New_York" }
    });

    expect(updateMock).toHaveBeenCalledWith({
      display_name: "New Name",
      timezone: "America/New_York"
    });

    expect(eqMock).toHaveBeenCalledWith("id", "user-123");
    
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: USER_PROFILE_UPDATED })
    );

    expect(result.profile.displayName).toBe("New Name");
  });

  it("retries fetching the profile if read-after-write initially fails (bounded retry)", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    const createdProfile = {
      id: "retry-123", email: "retry@ex.com", display_name: null, avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    
    maybeSingleMock
      .mockResolvedValueOnce({ data: createdProfile, error: null }) // upsert result
      .mockResolvedValueOnce({ data: null, error: null }) // retry check 1
      .mockResolvedValueOnce({ data: createdProfile, error: null }); // retry check 2

    const startTime = performance.now();
    const result = await repo.insertProfile({
      id: "retry-123",
      email: "retry@ex.com",
      timezone: "UTC"
    });
    const endTime = performance.now();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("retry-123");
    
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(maybeSingleMock).toHaveBeenCalledTimes(3);

    expect(endTime - startTime).toBeGreaterThanOrEqual(1);
  });

  it("returns null after exhausting bounded retries if profile cannot be found", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();
    
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const startTime = performance.now();
    const result = await repo.insertProfile({
      id: "fail-123",
      email: "fail@ex.com",
      timezone: "UTC"
    });
    const endTime = performance.now();

    expect(result).toBeNull();
    expect(upsertMock).toHaveBeenCalledTimes(1);
    
    const callCount = maybeSingleMock.mock.calls.length;
    expect(callCount).toBe(4); // 1 for upsert + 3 retries

    expect(endTime - startTime).toBeGreaterThanOrEqual(1);
  });
 
  it("getOrCreateUserProfile throws ProfileNotFoundError when bootstrap fails to yield a readable profile", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    vi.spyOn(ServerClientAdmin, "getSupabaseAdminClient").mockImplementation(() => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient);
    
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
 
    await expect(
      getOrCreateUserProfile(
        { userId: "user-999", email: "test@ex.com", source: InitializationSource.LAZY_PAGE_LOAD },
        context
      )
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("getOrCreateUserProfile preserves infrastructure errors (boundary specificity)", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    
    maybeSingleMock.mockImplementation(async () => {
      throw new Error("Database connection lost");
    });

    await expect(
      getOrCreateUserProfile(
        { userId: "user-999", email: "test@ex.com", source: InitializationSource.LAZY_PAGE_LOAD },
        context
      )
    ).rejects.toThrow("Database connection lost");
  });
});
