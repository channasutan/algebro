import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/observability", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  metrics: {
    increment: vi.fn(),
  },
  createServiceLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
}));

import { ensureProfileExists } from "../services/ensure-profile-exists";
import { getCurrentProfile } from "../services/get-current-profile";
import { updateProfile } from "../services/update-profile";
import { ProfileNotFoundError, ProfileCreationError, ProfileInvariantError } from "../errors";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import { eventBus } from "@/events/event-bus";
import { USER_PROFILE_INITIALIZED } from "../events/profile-initialized";
import { USER_PROFILE_UPDATED } from "../events/profile-updated";
import type { UserProfile } from "../domain/profile";
import type { Mock, Mocked } from "vitest";
import { logger } from "@/lib/observability";

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn(),
  },
}));

describe("User Profiles Service Logic", () => {
  let mockRepo: Mocked<ProfileRepository>;

  beforeEach(() => {
    vi.resetAllMocks();
    (eventBus.publish as Mock).mockResolvedValue(true);

    mockRepo = {
      findById: vi.fn(),
      insertProfile: vi.fn(),
      updateProfile: vi.fn(),
    } as unknown as Mocked<ProfileRepository>;
  });

  describe("ensureProfileExists", () => {
    it("returns existing profile immediately", async () => {
      const existingProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.findById.mockResolvedValue(existingProfile);

      const result = await ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });

      expect(mockRepo.findById).toHaveBeenCalledWith("user-1");
      expect(mockRepo.insertProfile).not.toHaveBeenCalled();
      expect(result).toEqual(existingProfile);
    });

    it("throws error when email is not provided", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        ensureProfileExists(mockRepo, { userId: "user-1", email: "" })
      ).rejects.toThrow(/\[user-profiles\] Cannot create profile without email/);

      await expect(
        ensureProfileExists(mockRepo, { userId: "user-1", email: "   " })
      ).rejects.toThrow(/\[user-profiles\] Cannot create profile without email/);

      expect(mockRepo.insertProfile).not.toHaveBeenCalled();
    });

    it("inserts profile and emits event if not found", async () => {
      mockRepo.findById.mockResolvedValue(null);
      
      const newProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.insertProfile.mockResolvedValue(newProfile);

      const result = await ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });

      expect(mockRepo.insertProfile).toHaveBeenCalledWith({
        id: "user-1",
        email: "test@ex.com",
        timezone: "UTC",
      });
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: USER_PROFILE_INITIALIZED,
          payload: expect.objectContaining({ userId: "user-1" }),
        })
      );
      expect(result).toEqual(newProfile);
    });

    it("throws ProfileCreationError if insert returns null and logs error", async () => {
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.insertProfile.mockResolvedValue(null); // insert failed to create or fetch profile

      const promise = ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });
      
      await expect(promise).rejects.toBeInstanceOf(ProfileCreationError);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
        event: "user-profiles.ensure",
        meta: expect.objectContaining({ 
          type: "domain",
          userId: "user-1",
          phase: "insert",
          outcome: "failure",
          durationMs: expect.any(Number)
        })
      }));
    });

    it("enforces data invariant (userId mismatch) and throws ProfileInvariantError", async () => {
      mockRepo.findById.mockResolvedValue(null);
      // Invariant violation: repository returns wrong userId
      mockRepo.insertProfile.mockResolvedValue({ 
        userId: "WRONG-ID", 
        email: "test@ex.com" 
      } as UserProfile);

      const promise = ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });

      await expect(promise).rejects.toBeInstanceOf(ProfileInvariantError);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
        event: "user-profiles.ensure",
        meta: expect.objectContaining({ 
          type: "domain",
          userId: "user-1",
          phase: "insert",
          outcome: "failure",
          durationMs: expect.any(Number),
          returnedUserId: "WRONG-ID"
        })
      }));
    });

    it("verifies repository retry is bounded (service only calls insertProfile once)", async () => {
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.insertProfile.mockResolvedValue(null);

      try {
        await ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });
      } catch {
        // Expected
      }

      // The service should only call the repo once; the repo itself is responsible for retries.
      expect(mockRepo.insertProfile).toHaveBeenCalledTimes(1);
    });

    it("preserves infrastructure errors from repository and logs them without wrapping", async () => {
      mockRepo.findById.mockResolvedValue(null);
      const networkError = new Error("Connection timeout");
      mockRepo.insertProfile.mockRejectedValue(networkError);

      await expect(
        ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" })
      ).rejects.toThrow("Connection timeout");
      
      expect(mockRepo.insertProfile).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({
        event: "user-profiles.ensure",
        meta: expect.objectContaining({ 
          type: "domain",
          userId: "user-1",
          phase: "infra",
          outcome: "failure",
          durationMs: expect.any(Number),
          error: "Connection timeout"
        })
      }));
    });

    it("does not log anything when findById returns null (expected state)", async () => {
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.insertProfile.mockResolvedValue({ userId: "user-1" } as UserProfile);

      await ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });

      // No error logs for lookup miss
      expect(logger.error).not.toHaveBeenCalled();
    });
    
    it("never crashes the event bus if publish fails because it catches internally", async () => {
      mockRepo.findById.mockResolvedValue(null);
      const newProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.insertProfile.mockResolvedValue(newProfile);
      
      (eventBus.publish as Mock).mockRejectedValue(new Error("Event bus failure"));
      
      // Should not throw
      const result = await ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });
      expect(result).toEqual(newProfile);
      // It caught the error inside implicitly (our logic has a .catch built-in)
    });
  });

  describe("getCurrentProfile", () => {
    it("returns profile if it exists", async () => {
      const existingProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.findById.mockResolvedValue(existingProfile);

      const result = await getCurrentProfile(mockRepo, { userId: "user-1" });
      expect(result).toEqual(existingProfile);
    });

    it("throws error if profile not found (lazy bootstrap disabled)", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        getCurrentProfile(mockRepo, { userId: "user-1" })
      ).rejects.toBeInstanceOf(ProfileNotFoundError);

      expect(mockRepo.insertProfile).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("updates profile, publishes event, and returns new profile", async () => {
      // Mock findById to return existing profile
      const existingProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.findById.mockResolvedValue(existingProfile);
      
      const updatedProfile = { ...existingProfile, displayName: "New Name", updatedAt: "new-date" };
      mockRepo.updateProfile.mockResolvedValue(updatedProfile);

      const result = await updateProfile(mockRepo, {
        userId: "user-1",
        changes: { displayName: "New Name", timezone: "America/New_York" }
      });

      expect(mockRepo.updateProfile).toHaveBeenCalledWith("user-1", {
        displayName: "New Name",
        timezone: "America/New_York"
      });
      
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: USER_PROFILE_UPDATED,
          payload: {
            userId: "user-1",
            changedFields: {
              display_name: "New Name",
              timezone: "America/New_York"
            },
            updatedAt: "new-date"
          }
        })
      );
      
      expect(result.profile).toEqual(updatedProfile);
    });

    it("verifies timezone via regex if Intl is not available (mocked out)", async () => {
      // Stub Intl.supportedValuesOf to simulate unavailable API
      vi.stubGlobal("Intl", {
        supportedValuesOf: undefined,
      } as unknown as typeof Intl);

      try {
        mockRepo.findById.mockResolvedValue({} as unknown as UserProfile);
        mockRepo.updateProfile.mockResolvedValue({ timezone: "Invalid", updatedAt: "2024-01-01T00:00:00Z" } as unknown as UserProfile);
        // Test invalid timezone format for regex
        await expect(
          updateProfile(mockRepo, { userId: "user-1", changes: { timezone: "invalid-tz" } })
        ).rejects.toThrow(/Invalid timezone/);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("rejects invalid timezone formats when Intl.supportedValuesOf is unavailable", async () => {
      // Stub Intl.supportedValuesOf to simulate unavailable API
      vi.stubGlobal("Intl", {
        supportedValuesOf: undefined,
      } as unknown as typeof Intl);

      try {
        mockRepo.findById.mockResolvedValue({} as unknown as UserProfile);
        mockRepo.updateProfile.mockResolvedValue({ timezone: "America/Argentina/Buenos_Aires", updatedAt: "2024-01-01T00:00:00Z" } as unknown as UserProfile);

        // Test invalid format - should fail with regex fallback
        await expect(
          updateProfile(mockRepo, { userId: "user-1", changes: { timezone: "invalid-tz" } })
        ).rejects.toThrow(/Invalid timezone/);

        // Test valid IANA format with regex fallback - should pass
        const result = await updateProfile(mockRepo, {
          userId: "user-1",
          changes: { timezone: "America/Argentina/Buenos_Aires" }
        });
        expect(result.profile.timezone).toBe("America/Argentina/Buenos_Aires");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("accepts UTC timezone in regex fallback path", async () => {
      // Stub Intl.supportedValuesOf to simulate unavailable API
      vi.stubGlobal("Intl", {
        supportedValuesOf: undefined,
      } as unknown as typeof Intl);

      try {
        mockRepo.findById.mockResolvedValue({} as unknown as UserProfile);
        mockRepo.updateProfile.mockResolvedValue({ timezone: "UTC", updatedAt: "2024-01-01T00:00:00Z" } as unknown as UserProfile);

        const result = await updateProfile(mockRepo, {
          userId: "user-1",
          changes: { timezone: "UTC" }
        });
        expect(result.profile.timezone).toBe("UTC");
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
