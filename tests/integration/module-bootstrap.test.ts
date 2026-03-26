import { afterEach, describe, expect, it, vi } from "vitest";

async function loadBootstrapModule() {
  vi.resetModules();

  const registerJobHandler = vi.fn();
  const materialProcessingHandler = vi.fn(async () => {});
  const populatePoolHandler = vi.fn(async () => {});

  vi.doMock("@/jobs/job-runner", () => ({
    registerJobHandler
  }));

  vi.doMock("@/jobs/handlers/material-processing", () => ({
    MATERIAL_PROCESSING_JOB: "material_processing",
    materialProcessingHandler
  }));

  vi.doMock("@/jobs/handlers/populate-pool", () => ({
    POPULATE_POOL_JOB: "populate_pool",
    populatePoolHandler,
    populatePoolPayloadSchema: { parse: vi.fn() }
  }));

  const bootstrapModule = await import("@/modules/bootstrap");

  return {
    ...bootstrapModule,
    registerJobHandler,
    materialProcessingHandler,
    populatePoolHandler
  };
}

describe("module bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/jobs/job-runner");
    vi.doUnmock("@/jobs/handlers/material-processing");
    vi.doUnmock("@/jobs/handlers/populate-pool");
  });

  it("is safe to call multiple times without re-registering shared handlers", async () => {
    const {
      ensureModulesBootstrapped,
      materialProcessingHandler,
      populatePoolHandler,
      registerJobHandler
    } = await loadBootstrapModule();

    await Promise.all([
      ensureModulesBootstrapped(),
      ensureModulesBootstrapped(),
      ensureModulesBootstrapped()
    ]);
    await ensureModulesBootstrapped();

    expect(registerJobHandler).toHaveBeenCalledTimes(2);
    expect(registerJobHandler).toHaveBeenCalledWith(
      "material_processing",
      materialProcessingHandler
    );
    expect(registerJobHandler).toHaveBeenCalledWith(
      "populate_pool",
      {
        handler: populatePoolHandler,
        schema: { parse: expect.any(Function) }
      }
    );
  });

  it("exposes only the authentication module public API through index.ts", async () => {
    const authenticationModule = await import("@/modules/authentication");

    expect(Object.keys(authenticationModule).sort()).toEqual([
      "authenticationModule",
      "getCurrentSession",
      "handleAuthCallback",
      "signInUser",
      "signOutUser",
      "signUpUser"
    ]);
    expect(authenticationModule.authenticationModule).toEqual({
      name: "authentication"
    });
  });

  it("exposes only the user-profiles module public API through index.ts", async () => {
    const userProfilesModule = await import("@/modules/user-profiles");

    expect(Object.keys(userProfilesModule).sort()).toEqual([
      "InitializationSource",
      "InvalidTimezoneError",
      "NoProfileFieldsError",
      "ProfileNotFoundError",
      "ensureProfileExists",
      "getCurrentProfile",
      "getOrCreateUserProfile",
      "updateUserProfile",
      "userProfilesModule"
    ]);
    expect(userProfilesModule.userProfilesModule).toEqual({
      name: "user-profiles"
    });
  });
});
