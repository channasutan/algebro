/**
 * Typed error classes for the user-profiles module.
 *
 * These errors enable instanceof-based handling in the transport layer,
 * eliminating fragile string-based error matching.
 */

export class ProfileNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`Profile not found for user: ${userId}`);
    this.name = "ProfileNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidTimezoneError extends Error {
  constructor(public readonly timezone: string) {
    super(`Invalid timezone: ${timezone}`);
    this.name = "InvalidTimezoneError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NoProfileFieldsError extends Error {
  constructor() {
    super("No profile fields provided for update");
    this.name = "NoProfileFieldsError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProfileCreationError extends Error {
  constructor(public readonly userId: string, public readonly reason?: string) {
    super(`Profile creation failed for user: ${userId}${reason ? ` - ${reason}` : ""}`);
    this.name = "ProfileCreationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProfileInvariantError extends Error {
  constructor(public readonly userId: string, public readonly details: string) {
    super(`Profile invariant violation for user: ${userId} - ${details}`);
    this.name = "ProfileInvariantError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
