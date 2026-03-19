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
import { getCurrentProfile } from "@/modules/user-profiles/services/get-current-profile";
import { getOrCreateUserProfile } from "@/modules/user-profiles/services/get-or-create-user-profile";
import { updateProfile } from "@/modules/user-profiles/services/update-profile";
import { InitializationSource } from "@/modules/user-profiles/domain/initialization-source";
import { eventBus } from "@/events/event-bus";
import { USER_PROFILE_UPDATED } from "@/modules/user-profiles/events/profile-updated";
import { ProfileNotFoundError, ProfileCreationError, ProfileInvariantError } from "@/modules/user-profiles/errors";

import * as ServerClientAuth from "@/lib/supabase/server-client";
import * as ServerClientAdmin from "@/lib/supabase/admin-client";

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
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
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

  // Cache references to internal mock functions for cleaner assertions
  let maybeSingleMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let upsertMock: ReturnType<typeof vi.fn>;
  let eqMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockSupabaseClient();
    maybeSingleMock = mockClient._mocks.maybeSingleMock as ReturnType<typeof vi.fn>;
    updateMock = mockClient._mocks.updateMock as ReturnType<typeof vi.fn>;
    upsertMock = mockClient._mocks.upsertMock as ReturnType<typeof vi.fn>;
    eqMock = mockClient._mocks.eqMock as ReturnType<typeof vi.fn>;
  });

  const getClient = async () => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient;

  it("throws error when profile not found", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // getCurrentProfile calls findById -> returns null
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      getCurrentProfile(repo, { userId: "user-123" })
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("updates a profile and validates RLS indirectly by ensuring equality check", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // Mock ensureProfileExists internal logic
    const existingProfile = {
      id: "user-123", email: "test@ex.com", display_name: "Old Name", avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    // ensureProfileExists calls findById
    maybeSingleMock.mockResolvedValueOnce({ data: existingProfile, error: null });
    
    // actual updateProfile call
    maybeSingleMock.mockResolvedValueOnce({
      data: { ...existingProfile, display_name: "New Name", timezone: "America/New_York", updated_at: "new-time" },
      error: null
    });

    const result = await updateProfile(repo, {
      userId: "user-123",
      changes: { displayName: "New Name", timezone: "America/New_York" }
    });

    // Assert update called
    expect(updateMock).toHaveBeenCalledWith({
      display_name: "New Name",
      timezone: "America/New_York"
    });

    // Assert RLS-like equality restriction (mocking how the client sets up the query)
    expect(eqMock).toHaveBeenCalledWith("id", "user-123");
    
    // Validate event
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: USER_PROFILE_UPDATED })
    );

    expect(result.profile.displayName).toBe("New Name");
  });

  // This test ensures bounded retry resolves eventual consistency
  // without duplicate writes or infinite loops.
  it("retries fetching the profile if read-after-write initially fails (bounded retry)", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();

    // findById operations: Attempt 1 returns null, Attempt 2 returns valid profile
    const createdProfile = {
      id: "retry-123", email: "retry@ex.com", display_name: null, avatar_url: null, timezone: "UTC", updated_at: "time"
    };
    
    // Using mockResolvedValueOnce to queue sequence of returns for `maybeSingle()`
    // 1st call: findById (inside insertProfile loop) -> returns null
    // 2nd call: findById (retry attempt 1) -> returns valid profile
    maybeSingleMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: createdProfile, error: null });

    const startTime = Date.now();
    const result = await repo.insertProfile({
      id: "retry-123",
      email: "retry@ex.com",
      timezone: "UTC"
    });
    const endTime = Date.now();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("retry-123");
    
    // Assert exactly one upsert
    expect(upsertMock).toHaveBeenCalledTimes(1);
    
    // Assert select was called twice (initial + 1 retry)
    expect(maybeSingleMock).toHaveBeenCalledTimes(2);

    // Note: This test relies on real timing delays (5ms + 10ms) which may be flaky in CI
    // Timing assertion removed for test determinism

    expect(endTime - startTime).toBeGreaterThanOrEqual(5);
  });

  // This test ensures failure path is deterministic and observable.
  it("returns null after exhausting bounded retries if profile cannot be found", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    const repo = createSupabaseProfileRepository();
    

    // maybeSingle always returns null
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const startTime = Date.now();
    const result = await repo.insertProfile({
      id: "fail-123",
      email: "fail@ex.com",
      timezone: "UTC"
    });
    const endTime = Date.now();

    expect(result).toBeNull();

    // Assert exactly one upsert
    expect(upsertMock).toHaveBeenCalledTimes(1);
    
    // Assert select was called 3 times (initial + 2 retries, meaning a total of 3 reads)
    const callCount = maybeSingleMock.mock.calls.length;
    expect(callCount).toBe(3);

    // It should have taken at least 5 + 10 ms = 15ms due to sleep sequence before it returns null.
    expect(endTime - startTime).toBeGreaterThanOrEqual(15);
  });
 
  it("getOrCreateUserProfile throws ProfileNotFoundError when bootstrap fails to yield a readable profile", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    vi.spyOn(ServerClientAdmin, "getSupabaseAdminClient").mockImplementation(() => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient);
    
    // maybeSingle always returns null
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
 
    await expect(
      getOrCreateUserProfile(
        { userId: "user-999", email: "test@ex.com", source: InitializationSource.LAZY_PAGE_LOAD },
        { requestId: "test-req" }
      )
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("getOrCreateUserProfile preserves ProfileInvariantError (boundary specificity)", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    vi.spyOn(ServerClientAdmin, "getSupabaseAdminClient").mockImplementation(() => mockClient as unknown as import("@supabase/supabase-js").SupabaseClient);
    
    // Deterministic mock implementation using a scoped counter
    let callCount = 0;
    maybeSingleMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { data: null, error: null }; // getOrCreateUserProfile initial check
      if (callCount === 2) return { data: null, error: null }; // ensureProfileExists initial check
      if (callCount === 3) return { data: { id: "WRONG-ID", email: "test@ex.com" }, error: null }; // insertProfile find
      return { data: null, error: null };
    });

    await expect(
      getOrCreateUserProfile(
        { userId: "user-999", email: "test@ex.com", source: InitializationSource.LAZY_PAGE_LOAD },
        { requestId: "test-req" }
      )
    ).rejects.toBeInstanceOf(ProfileInvariantError);
  });

  it("getOrCreateUserProfile preserves infrastructure errors (boundary specificity)", async () => {
    vi.spyOn(ServerClientAuth, "getSupabaseServerClient").mockImplementation(getClient);
    
    maybeSingleMock.mockImplementation(async () => {
      throw new Error("Database connection lost");
    });

    await expect(
      getOrCreateUserProfile(
        { userId: "user-999", email: "test@ex.com", source: InitializationSource.LAZY_PAGE_LOAD },
        { requestId: "test-req" }
      )
    ).rejects.toThrow("Database connection lost");
  });
});
