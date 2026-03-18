import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from "vitest";
import { ensureProfileExists } from "../services/ensure-profile-exists";
import { getCurrentProfile } from "../services/get-current-profile";
import { updateProfile } from "../services/update-profile";
import type { ProfileRepository } from "../repositories/supabase-profile-repository";
import { eventBus } from "@/events/event-bus";
import { USER_PROFILE_INITIALIZED } from "../events/profile-initialized";
import { USER_PROFILE_UPDATED } from "../events/profile-updated";
import type { UserProfile } from "../domain/profile";

vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn(),
  },
}));

describe("User Profiles Service Logic", () => {
  let mockRepo: Mocked<ProfileRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
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

    it("throws if insert returns null (e.g. race condition prevents creation)", async () => {
      mockRepo.findById.mockResolvedValue(null);
      // Cast to allow null return - simulates repository returning null on race condition
      mockRepo.insertProfile.mockResolvedValue(null as unknown as UserProfile);

      await expect(
        ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" })
      ).rejects.toThrow(/failed to create or load profile/);
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
      ).rejects.toThrow(/\[user-profiles\] Profile not found/);

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
