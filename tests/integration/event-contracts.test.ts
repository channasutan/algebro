import { describe, expect, it } from "vitest";

import type { CoreDomainEventType } from "@/events/event-types";

import {
  AUTH_USER_REGISTERED,
  createAuthUserRegisteredEvent,
  type AuthUserRegisteredPayload
} from "@/modules/authentication/events/auth-user-registered";

import {
  USER_PROFILE_INITIALIZED,
  createUserProfileInitializedEvent,
  type UserProfileInitializedPayload
} from "@/modules/user-profiles/events/profile-initialized";

import {
  USER_PROFILE_UPDATED,
  createUserProfileUpdatedEvent,
  type UserProfileUpdatedPayload
} from "@/modules/user-profiles/events/profile-updated";

// Compile-time assertion: each constant must be assignable to CoreDomainEventType.
// If a constant drifts from the registry this file will fail to compile.
const _typeCheckAuthRegistered: CoreDomainEventType = AUTH_USER_REGISTERED;
const _typeCheckProfileInitialized: CoreDomainEventType = USER_PROFILE_INITIALIZED;
const _typeCheckProfileUpdated: CoreDomainEventType = USER_PROFILE_UPDATED;

// Prevent unused variable warnings - these exist only for compile-time type checking
void _typeCheckAuthRegistered;
void _typeCheckProfileInitialized;
void _typeCheckProfileUpdated;

const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// auth_user_registered
// ---------------------------------------------------------------------------

describe("auth_user_registered event contract", () => {
  const samplePayload: AuthUserRegisteredPayload = {
    userId: "user-001",
    email: "test@example.com",
    registeredAt: "2026-03-16T08:00:00.000Z",
    source: "email"
  };

  it("event type exists in the registry", () => {
    expect(AUTH_USER_REGISTERED).toBe("auth_user_registered");
  });

  it("payload is serializable", () => {
    const cloned = structuredClone(samplePayload);
    expect(cloned).toEqual(samplePayload);
  });

  it("factory produces a valid event object", () => {
    const event = createAuthUserRegisteredEvent(samplePayload);

    expect(event.event_type).toBe("auth_user_registered");
    expect(event.event_id).toMatch(UUID_REGEX);
    expect(event.timestamp).toMatch(ISO_TIMESTAMP_REGEX);
    expect(event.payload.userId).toBe("user-001");
    expect(event.payload.email).toBe("test@example.com");
    expect(event.payload.registeredAt).toBe("2026-03-16T08:00:00.000Z");
    expect(event.payload.source).toBe("email");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// user_profile_initialized
// ---------------------------------------------------------------------------

describe("user_profile_initialized event contract", () => {
  const samplePayload: UserProfileInitializedPayload = {
    userId: "user-002",
    email: "profile@example.com",
    displayName: "Alice",
    initializedAt: "2026-03-16T09:00:00.000Z",
    initializationSource: "auth_event"
  };

  it("event type exists in the registry", () => {
    expect(USER_PROFILE_INITIALIZED).toBe("user_profile_initialized");
  });

  it("payload is serializable", () => {
    const cloned = structuredClone(samplePayload);
    expect(cloned).toEqual(samplePayload);
  });

  it("factory produces a valid event object", () => {
    const event = createUserProfileInitializedEvent(samplePayload);

    expect(event.event_type).toBe("user_profile_initialized");
    expect(event.event_id).toMatch(UUID_REGEX);
    expect(event.timestamp).toMatch(ISO_TIMESTAMP_REGEX);
    expect(event.payload.userId).toBe("user-002");
    expect(event.payload.email).toBe("profile@example.com");
    expect(event.payload.displayName).toBe("Alice");
    expect(event.payload.initializedAt).toBe("2026-03-16T09:00:00.000Z");
    expect(event.payload.initializationSource).toBe("auth_event");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// user_profile_updated
// ---------------------------------------------------------------------------

describe("user_profile_updated event contract", () => {
  const samplePayload: UserProfileUpdatedPayload = {
    userId: "user-003",
    changedFields: { display_name: "Alice Updated", avatar_url: "https://example.com/avatar.png" },
    updatedAt: "2026-03-16T10:00:00.000Z"
  };

  it("event type exists in the registry", () => {
    expect(USER_PROFILE_UPDATED).toBe("user_profile_updated");
  });

  it("payload is serializable", () => {
    const cloned = structuredClone(samplePayload);
    expect(cloned).toEqual(samplePayload);
  });

  it("factory produces a valid event object", () => {
    const event = createUserProfileUpdatedEvent(samplePayload);

    expect(event.event_type).toBe("user_profile_updated");
    expect(event.event_id).toMatch(UUID_REGEX);
    expect(event.timestamp).toMatch(ISO_TIMESTAMP_REGEX);
    expect(event.payload.userId).toBe("user-003");
    expect(event.payload.changedFields).toEqual({ display_name: "Alice Updated", avatar_url: "https://example.com/avatar.png" });
    expect(event.payload.updatedAt).toBe("2026-03-16T10:00:00.000Z");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });
});
