import { describe, expect, it, vi } from "vitest";

import { eventBus } from "@/events/event-bus";
import { TEST_PASSWORD } from "@/tests/test-constants";
import { AUTH_USER_REGISTERED } from "@/modules/authentication/events/auth-user-registered";

import { signUpUser } from "../services/sign-up-user";
import { signInUser } from "../services/sign-in-user";
import { signOutUser } from "../services/sign-out-user";
import { getCurrentSession } from "../services/get-current-session";
import { handleAuthCallback } from "../services/handle-auth-callback";
import type { AuthRepository } from "../repositories/supabase-auth-repository";

// Mock the event bus so we don't trigger real subscribers during domain tests
vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn()
  }
}));

describe("Authentication Services", () => {
  const mockRepository = (): AuthRepository => ({
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    exchangeCodeForSession: vi.fn()
  });

  describe("signUpUser", () => {
    it("delegates to repository and emits auth_user_registered on success", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signUp).mockResolvedValue({
        userId: "user-123",
        email: "test@example.com",
        requiresEmailConfirmation: true,
      });

      const result = await signUpUser(
        { email: "test@example.com", password: TEST_PASSWORD },
        repo
      );

      expect(repo.signUp).toHaveBeenCalledWith({ email: "test@example.com", password: TEST_PASSWORD });
      expect(result.userId).toBe("user-123");
      expect(result.requiresEmailConfirmation).toBe(true);

      // Verify event was emitted
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const emittedEvent = vi.mocked(eventBus.publish).mock.calls[0][0];
      expect(emittedEvent.event_type).toBe(AUTH_USER_REGISTERED);
      expect(emittedEvent.payload.userId).toBe("user-123");
      expect(emittedEvent.payload.email).toBe("test@example.com");
    });

    it("does not emit event if user creation fails (userId is null)", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signUp).mockResolvedValue({
        userId: null,
        email: null,
        requiresEmailConfirmation: true,
      });
      vi.mocked(eventBus.publish).mockClear();

      const result = await signUpUser(
        { email: "existing@example.com", password: TEST_PASSWORD },
        repo
      );

      expect(repo.signUp).toHaveBeenCalled();
      expect(result.userId).toBeNull();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it("bubbles up repository errors", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signUp).mockRejectedValue(new Error("Database error"));
      vi.mocked(eventBus.publish).mockClear();

      await expect(
        signUpUser({ email: "test@example.com", password: TEST_PASSWORD }, repo)
      ).rejects.toThrow("Database error");

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it("does not throw if event publishing fails (best-effort)", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signUp).mockResolvedValue({
        userId: "user-456",
        email: "test@example.com",
        requiresEmailConfirmation: false,
      });

      // Simulate event bus failure
      vi.mocked(eventBus.publish).mockRejectedValue(new Error("Event bus unavailable"));

      // Should not throw - event publishing is best-effort
      const result = await signUpUser(
        { email: "test@example.com", password: TEST_PASSWORD },
        repo
      );

      expect(result.userId).toBe("user-456");
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe("signInUser", () => {
    it("delegates to repository", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signIn).mockResolvedValue({ success: true, redirectTo: "/dashboard" });

      const result = await signInUser(
        { email: "test@example.com", password: TEST_PASSWORD },
        repo
      );

      expect(repo.signIn).toHaveBeenCalledWith({ email: "test@example.com", password: TEST_PASSWORD });
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe("/dashboard");
    });
  });

  describe("signOutUser", () => {
    it("delegates to repository", async () => {
      const repo = mockRepository();
      vi.mocked(repo.signOut).mockResolvedValue();

      await signOutUser(repo);

      expect(repo.signOut).toHaveBeenCalled();
    });
  });

  describe("getCurrentSession", () => {
    it("delegates to repository and returns active session", async () => {
      const repo = mockRepository();
      const mockSession = {
        userId: "user-1",
        email: "test@example.com",
        isAuthenticated: true
      };
      vi.mocked(repo.getSession).mockResolvedValue({ session: mockSession });

      const result = await getCurrentSession(repo);

      expect(repo.getSession).toHaveBeenCalled();
      expect(result.session).toEqual(mockSession);
    });

    it("returns null session when not authenticated", async () => {
      const repo = mockRepository();
      vi.mocked(repo.getSession).mockResolvedValue({ session: null });

      const result = await getCurrentSession(repo);

      expect(repo.getSession).toHaveBeenCalled();
      expect(result.session).toBeNull();
    });
  });

  describe("handleAuthCallback", () => {
    it("delegates to repository for valid code", async () => {
      const repo = mockRepository();
      vi.mocked(repo.exchangeCodeForSession).mockResolvedValue();

      await handleAuthCallback("valid-code-123", repo);

      expect(repo.exchangeCodeForSession).toHaveBeenCalledWith("valid-code-123");
    });

    it("throws error for empty code without calling repository", async () => {
      const repo = mockRepository();

      await expect(handleAuthCallback("", repo)).rejects.toThrow("Auth callback code must be a non-empty string");
      await expect(handleAuthCallback("   ", repo)).rejects.toThrow("Auth callback code must be a non-empty string");
      
      expect(repo.exchangeCodeForSession).not.toHaveBeenCalled();
    });
  });
});
