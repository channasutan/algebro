import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as handleCallbackRoute } from "@/app/auth/callback/route";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

// Mock the dependencies: Mock ONLY authentication module and bootstrap.
vi.mock("@/modules/bootstrap", () => ({
  ensureModulesBootstrapped: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/authentication", () => ({
  signUpUser: vi.fn(),
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
  getCurrentSession: vi.fn(),
  handleAuthCallback: vi.fn().mockResolvedValue(undefined),
}));

// We strictly control next/headers cookies to return an empty object avoiding Server Context bugs
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

// Mock redirect to inspect parameters on transport routing handlers
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

import { signUpAction } from "@/app/sign-up/actions";
import { signInAction } from "@/app/sign-in/actions";
import { signOutAction } from "@/app/sign-out/actions";

import { ensureModulesBootstrapped } from "@/modules/bootstrap";
import { signUpUser, signInUser, signOutUser, handleAuthCallback } from "@/modules/authentication";

describe("Auth UI Actions Transport Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

    it("1. sign up success calls ensureModulesBootstrapped BEFORE auth service", async () => {
        const formData = new FormData();
        formData.append("email", "test@example.com");
        formData.append("password", "test-password"); // TEST ONLY: DO NOT USE REAL CREDENTIALS

        (signUpUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            userId: "123",
            requiresEmailConfirmation: false,
        });

    const result = await signUpAction({ success: false, error: "" }, formData);

    expect(result).toEqual({ success: true });
    
    // 6. ensureModulesBootstrapped is called
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
    
    // 7. ensureModulesBootstrapped is called BEFORE auth service
    const bootstrapOrder = (ensureModulesBootstrapped as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const signUpOrder = (signUpUser as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(bootstrapOrder).toBeLessThan(signUpOrder);
  });

  it("2. sign up validation failure rejects bad inputs BEFORE triggering services", async () => {
    const formData = new FormData();
    formData.append("email", "   ");
    formData.append("password", "   ");

    const result = await signUpAction({ success: false, error: "" }, formData);

    // Assert action result contract
    expect(result.success).toBe(false);
    expect(result).toHaveProperty("error");
    
    // Verify services were NOT called
    expect(signUpUser).not.toHaveBeenCalled();
    // But bootstrap still ran first
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
  });

    it("3. sign in success triggers bootstrap and services nicely", async () => {
        const formData = new FormData();
        // Prove email normalization is applied
        formData.append("email", " TEST@example.com ");
        formData.append("password", "test-password"); // TEST ONLY: DO NOT USE REAL CREDENTIALS

    (signInUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });

    const result = await signInAction({ success: false, error: "" }, formData);

    expect(result).toEqual({ success: true });
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
    
     // Verify email was trimmed and lowercase mapped
     expect(signInUser).toHaveBeenCalledWith({
       email: "test@example.com",
       password: "test-password", // TEST ONLY: DO NOT USE REAL CREDENTIALS
     }, { requestId: "system" });
  });

    it("4. sign in failure prevents leakage of verbose trace data by wrapping raw errors safely", async () => {
        const formData = new FormData();
        formData.append("email", "test@example.com");
        formData.append("password", "test-password"); // TEST ONLY: DO NOT USE REAL CREDENTIALS

    // Mock a verbose unsafe database error 
    (signInUser as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("RAW_SUPABASE_ERROR: INVALID_CREDENTIALS [10x5R]")
    );

    const result = await signInAction({ success: false, error: "" }, formData);

    // It should strip the trace and safely output a deterministic message
    expect(result).toEqual({ success: false, error: "Invalid email or password" });
    expect(signInUser).toHaveBeenCalledTimes(1);
  });

  it("5. sign out execution runs appropriately", async () => {
    (signOutUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await signOutAction();

    expect(result).toEqual({ success: true });
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });
});

describe("Auth Callback Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. rejects request with missing query param code by triggering redirect", async () => {
    const req = new NextRequest("http://localhost/auth/callback?next=/dashboard");

    await expect(handleCallbackRoute(req)).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith("/sign-in?error=invalid_callback");
    expect(handleAuthCallback).not.toHaveBeenCalled();
    expect(ensureModulesBootstrapped).toHaveBeenCalledTimes(1);
  });

  it("2. supports bootstrap order and triggers auth exchange correctly with code", async () => {
    const req = new NextRequest("http://localhost/auth/callback?code=EXCHANGE_CODE&next=/dashboard");

    await expect(handleCallbackRoute(req)).rejects.toThrow();

    expect(handleAuthCallback).toHaveBeenCalledWith("EXCHANGE_CODE", { requestId: "system" });
    
    // Validate bounds order: bootstrap MUST run before endpoint logic
    const bootstrapOrder = (ensureModulesBootstrapped as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const callbackOrder = (handleAuthCallback as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(bootstrapOrder).toBeLessThan(callbackOrder);

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("3. falls back safely upon internal callback service faults", async () => {
    const req = new NextRequest("http://localhost/auth/callback?code=BAD_CODE");
    (handleAuthCallback as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Auth failed"));

    await expect(handleCallbackRoute(req)).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
  });

  it("4. redirects to root if the next parameter is an open redirect path", async () => {
    // Reset mock to ensure it resolves (not rejects from previous test)
    (handleAuthCallback as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    const req = new NextRequest("http://localhost/auth/callback?code=EXCHANGE_CODE&next=http://malicious.com");

    await expect(handleCallbackRoute(req)).rejects.toThrow();

    expect(handleAuthCallback).toHaveBeenCalledWith("EXCHANGE_CODE", { requestId: "system" });
    // Should fall back to root "/"
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
