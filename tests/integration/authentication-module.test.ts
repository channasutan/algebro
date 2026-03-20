import { describe, expect, it, vi, beforeEach } from "vitest";

import { eventBus } from "@/events/event-bus";
import { TEST_PASSWORD } from "@/tests/test-constants";
import { AUTH_USER_REGISTERED } from "@/modules/authentication/events/auth-user-registered";
import { signUpUser } from "@/modules/authentication/services/sign-up-user";
import { buildAuthRepository } from "@/modules/authentication/repositories/supabase-auth-repository";
import { buildSupabaseServerClient } from "@/lib/supabase/server-client";
import type { SupabaseClient } from "@/lib/supabase/server-client";

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
  // Typed mock for Supabase auth client
  const createMockSupabaseAuth = () => ({
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  });

  type MockSupabaseAuth = ReturnType<typeof createMockSupabaseAuth>;
  type MockCookieStore = {
    getAll: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
    size: number;
    [Symbol.iterator]: ReturnType<typeof vi.fn>;
  };

  let mockSupabaseAuth: MockSupabaseAuth;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseAuth = createMockSupabaseAuth();

    // Partial mock: only `auth` is needed by the repository under test.
    // The `as unknown as SupabaseClient` cast is intentional for test isolation.
    vi.mocked(buildSupabaseServerClient).mockReturnValue({
      auth: mockSupabaseAuth,
    } as unknown as SupabaseClient);
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
    const mockCookieStore: MockCookieStore = {
      getAll: vi.fn().mockReturnValue([]),
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn().mockReturnValue(false),
      size: 0,
      [Symbol.iterator]: vi.fn(),
    };
    const repo = buildAuthRepository(mockCookieStore);

    // 3. Act - call the top-level service
    const result = await signUpUser(
      repo,
      { email: "integration@example.com", password: TEST_PASSWORD },
      { requestId: "test-req" }
    );

    // 4. Assert client was called correctly
    expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
      email: "integration@example.com",
      password: TEST_PASSWORD
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
