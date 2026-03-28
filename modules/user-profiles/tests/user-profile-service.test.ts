import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from "vitest";

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
import { ProfileNotFoundError, ProfileCreationError } from "../errors";
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
  const context = { requestId: "test-req" };

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

    it("throws ProfileCreationError if insert returns null", async () => {
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.insertProfile.mockResolvedValue(null as unknown as UserProfile);

      const promise = ensureProfileExists(mockRepo, { userId: "user-1", email: "test@ex.com" });
      
      await expect(promise).rejects.toBeInstanceOf(ProfileCreationError);
    });
  });

  describe("getCurrentProfile", () => {
    it("returns profile if it exists", async () => {
      const existingProfile = { userId: "user-1", email: "test@ex.com", displayName: null, avatarUrl: null, timezone: "UTC", updatedAt: "date" };
      mockRepo.findById.mockResolvedValue(existingProfile);

      const result = await getCurrentProfile(mockRepo, { userId: "user-1" });
      expect(result).toEqual(existingProfile);
    });

    it("throws error if profile not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        getCurrentProfile(mockRepo, { userId: "user-1" })
      ).rejects.toBeInstanceOf(ProfileNotFoundError);

      expect(mockRepo.insertProfile).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("updates profile, publishes event, and returns new profile", async () => {
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
  });
});
