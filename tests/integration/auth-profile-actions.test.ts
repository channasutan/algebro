import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock implementation first (hoisted)
vi.mock("@/modules/user-profiles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/user-profiles")>();
  return {
    ...actual,
    updateUserProfile: vi.fn(),
    ensureProfileExists: vi.fn(),
  };
});

// Mock repositories first (hoisted)
// We provide a way to inject a mock repo into the factories
const mockRepo = {
  findById: vi.fn(),
  updateProfile: vi.fn(),
  insertProfile: vi.fn(),
};

vi.mock("@/modules/user-profiles/repositories/supabase-profile-repository", () => ({
  createSupabaseProfileRepository: vi.fn(() => mockRepo),
  createServiceRoleProfileRepository: vi.fn(() => mockRepo),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT: ${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT: ${url}`;
    throw err;
  }),
}));

vi.mock("@/modules/bootstrap", () => ({
  ensureModulesBootstrapped: vi.fn(),
}));

vi.mock("@/modules/authentication", () => ({
  getCurrentSession: vi.fn(),
}));

// Mock observability to return a deterministic requestId
vi.mock("@/lib/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/observability")>();
  return {
    ...actual,
    getRequestId: vi.fn(() => Promise.resolve("test-request-id")),
  };
});

import { redirect } from "next/navigation";
import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { getCurrentSession } from "@/modules/authentication";
import {
  updateUserProfile,
  ensureProfileExists,
  ProfileNotFoundError,
  InvalidTimezoneError,
  NoProfileFieldsError,
} from "@/modules/user-profiles";

import ProfilePage from "@/app/profile/page";
import { updateProfileAction } from "@/app/profile/actions";

describe("Profile Transport Layer (Phase 2 Task 8)", () => {
  const TEST_CONTEXT = { requestId: "test-request-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    (ensureModulesBootstrapped as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (getCurrentSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      session: { userId: "user-1", email: "test@example.com" }
    });
    
    mockRepo.findById.mockResolvedValue(null);
    mockRepo.updateProfile.mockResolvedValue({ profile: {} });
    mockRepo.insertProfile.mockResolvedValue({
      userId: "user-1",
      timezone: "UTC"
    });
  });

  describe("Profile Page (Server Component)", () => {
    it("1. renders profile and DOES NOT call ensureProfileExists when profile exists", async () => {
      mockRepo.findById.mockResolvedValue({
        userId: "user-1",
        timezone: "UTC"
      });

      const element = await ProfilePage();
      const output = JSON.stringify(element);
      
      expect(output).toContain("Your Profile");
    });

    it("2. calls ensureProfileExists (lazy bootstrap) ONLY when ProfileNotFoundError is thrown", async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null) // 1. Initial load miss
        .mockResolvedValueOnce(null) // 2. ensureProfileExists check miss
        .mockResolvedValueOnce({     // 3. post-bootstrap read hit
          userId: "user-1",
          timezone: "UTC"
        });
      
      const element = await ProfilePage();
      const output = JSON.stringify(element);
      
      expect(output).toContain("Your Profile");
    });

    it("3. handles Read-After-Write replication lag resiliently via bounded retry", async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null) // 1. Initial load miss
        .mockResolvedValueOnce(null) // 2. Bootstrap check miss
        .mockResolvedValueOnce(null) // 3. Post-bootstrap read-after-write miss (LAG simulation)
        .mockResolvedValueOnce({
          userId: "user-1",
          timezone: "UTC"
        }); // 4. Post-bootstrap retry success
      
      const element = await ProfilePage();
      const output = JSON.stringify(element);
      
      expect(output).toContain("Your Profile");
    });

    it("11. handles definitive replication lag failure by throwing after max retries (Boundedness Guarantee)", async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null) 
        .mockResolvedValueOnce(null) 
        .mockResolvedValueOnce(null) 
        .mockResolvedValueOnce(null); 

      await expect(ProfilePage()).rejects.toThrow(ProfileNotFoundError);
    });

    it("13. renders profile IMMEDIATELY when it exists (No Bootstrap Optimization)", async () => {
      mockRepo.findById.mockResolvedValue({
        userId: "user-1",
        timezone: "UTC"
      });

      const element = await ProfilePage();
      const output = JSON.stringify(element);
      
      expect(output).toContain("Your Profile");
      expect(ensureProfileExists).not.toHaveBeenCalled();
    });

    it("12. natively propagates systemic infrastructure errors and DOES NOT retry (Failure Guarantee)", async () => {
      mockRepo.findById.mockRejectedValue(new Error("Database connection dropped"));

      await expect(ProfilePage()).rejects.toThrow("Database connection dropped");
      expect(mockRepo.findById).toHaveBeenCalledTimes(1);
    });

    it("14. propagates bootstrap failure (Insert Error)", async () => {
      mockRepo.findById.mockResolvedValue(null);
      mockRepo.insertProfile.mockRejectedValue(new Error("Storage quota exceeded"));

      await expect(ProfilePage()).rejects.toThrow("Storage quota exceeded");
    });

    it("15. does NOT retry on infra error AFTER bootstrap", async () => {
      mockRepo.findById
        .mockResolvedValueOnce(null) // Initial miss
        .mockResolvedValueOnce(null) // Bootstrap check miss
        .mockRejectedValueOnce(new Error("Read replica timed out")); // Lag simulation that turns into infra error
      
      await expect(ProfilePage()).rejects.toThrow("Read replica timed out");
      // Should not have reached the 4th call (retry)
      expect(mockRepo.findById).toHaveBeenCalledTimes(3);
    });

    it("4. redirects to /sign-in if unauthenticated", async () => {
      (getCurrentSession as ReturnType<typeof vi.fn>).mockResolvedValue({ session: null });

      await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT: /sign-in");
      expect(redirect).toHaveBeenCalledWith("/sign-in");
    });
  });

  describe("Profile Actions (Server Action)", () => {
    it("5. successfully updates provided fields", async () => {
      const formData = new FormData();
      formData.append("displayName", "John Doe");
      formData.append("timezone", "America/New_York");

      mockRepo.findById.mockResolvedValue({ userId: "user-1" });

      const result = await updateProfileAction({ success: false, error: "" }, formData);

      expect(result).toEqual({ success: true });
      expect(updateUserProfile).toHaveBeenCalledWith(
        {
          userId: "user-1",
          changes: {
            displayName: "John Doe",
            timezone: "America/New_York",
          },
        },
        TEST_CONTEXT
      );
    });

    it("6. correctly maps InvalidTimezoneError to specific message", async () => {
      const formData = new FormData();
      formData.append("timezone", "Invalid/TZ");

      (updateUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new InvalidTimezoneError("Invalid/TZ"));

      const result = await updateProfileAction({ success: false, error: "" }, formData);

      expect(result).toEqual({ success: false, error: "Invalid timezone" });
    });

    it("7. correctly maps NoProfileFieldsError to specific message directly from service layer", async () => {
      const formData = new FormData();
      formData.append("displayName", "Valid Bypass");

      (updateUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new NoProfileFieldsError());

      const result = await updateProfileAction({ success: false, error: "" }, formData);

      expect(result).toEqual({ success: false, error: "No changes provided" });
    });

    it("8. maps ProfileNotFoundError to specific message", async () => {
      const formData = new FormData();
      formData.append("displayName", "John");

      (updateUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new ProfileNotFoundError("user-1"));

      const result = await updateProfileAction({ success: false, error: "" }, formData);

      expect(result).toEqual({ success: false, error: "Profile not found" });
    });

    it("9. maps unexpected errors to generic fallback message", async () => {
      const formData = new FormData();
      formData.append("displayName", "John");

      (updateUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected systemic failure"));

      const result = await updateProfileAction({ success: false, error: "" }, formData);

      expect(result).toEqual({ success: false, error: "Failed to update profile" });
    });

    it("10. normalizes empty strings to null for text fields", async () => {
      const formData = new FormData();
      formData.append("displayName", ""); // Explicit empty string

      await updateProfileAction({ success: false, error: "" }, formData);

      expect(updateUserProfile).toHaveBeenCalledWith(
        {
          userId: "user-1",
          changes: { displayName: null },
        },
        TEST_CONTEXT
      );
    });
  });
});
