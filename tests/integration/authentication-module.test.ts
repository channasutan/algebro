/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { eventBus } from "@/events/event-bus";
import { AUTH_USER_REGISTERED } from "@/modules/authentication/events/auth-user-registered";
import {
  signUpUser,
  buildAuthRepository,
} from "@/modules/authentication";
import { buildSupabaseServerClient } from "@/lib/supabase/server-client";

// Minimal mock of next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock the Supabase client builder so we intercept actual Supabase calls
vi.mock("@/lib/supabase/server-client", () => ({
  buildSupabaseServerClient: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

// Mock event bus
vi.mock("@/events/event-bus", () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn()
  }
}));

describe("Authentication Module Integration", () => {
  let mockSupabaseAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseAuth = {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    };

    // Replace the built client with our mock
    vi.mocked(buildSupabaseServerClient).mockReturnValue({
      auth: mockSupabaseAuth,
    } as any);
  });

  it("completes the full loop: service -> repository -> database client -> event bus", async () => {
    // 1. Arrange Supabase client response
    mockSupabaseAuth.signUp.mockResolvedValue({
      data: {
        user: { id: "real-uuid-1", email: "integration@example.com" },
        session: null
      },
      error: null
    });

    // 2. Setup the real repository injected with a mock cookie store
    const mockCookieStore: any = { getAll: vi.fn(), setAll: vi.fn() };
    const repo = buildAuthRepository(mockCookieStore);

    // 3. Act - call the top-level service
    const result = await signUpUser(
      { email: "integration@example.com", password: "strongpassword" },
      repo
    );

    // 4. Assert client was called correctly
    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: "integration@example.com",
      password: "strongpassword"
    });

    // 5. Assert service response matches
    expect(result.userId).toBe("real-uuid-1");

    // 6. Assert correct domain event was emitted
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const emittedEvent = vi.mocked(eventBus.publish).mock.calls[0][0];
    
    expect(emittedEvent.event_type).toBe(AUTH_USER_REGISTERED);
    expect(emittedEvent.payload).toMatchObject({
      userId: "real-uuid-1",
      email: "integration@example.com"
    });
  });
});
