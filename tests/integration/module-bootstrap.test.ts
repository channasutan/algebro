import { afterEach, describe, expect, it, vi } from "vitest";

async function loadBootstrapModule() {
  vi.resetModules();

  const registerJobHandler = vi.fn();
  const materialProcessingHandler = vi.fn(async () => {});

  vi.doMock("@/jobs/job-runner", () => ({
    registerJobHandler
  }));

  vi.doMock("@/jobs/handlers/material-processing", () => ({
    MATERIAL_PROCESSING_JOB: "material_processing",
    materialProcessingHandler
  }));

  const bootstrapModule = await import("@/modules/bootstrap");

  return {
    ...bootstrapModule,
    registerJobHandler,
    materialProcessingHandler
  };
}

describe("module bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("@/jobs/job-runner");
    vi.doUnmock("@/jobs/handlers/material-processing");
  });

  it("is safe to call multiple times without re-registering shared handlers", async () => {
    const {
      ensureModulesBootstrapped,
      materialProcessingHandler,
      registerJobHandler
    } = await loadBootstrapModule();

    await Promise.all([
      ensureModulesBootstrapped(),
      ensureModulesBootstrapped(),
      ensureModulesBootstrapped()
    ]);
    await ensureModulesBootstrapped();

    expect(registerJobHandler).toHaveBeenCalledTimes(1);
    expect(registerJobHandler).toHaveBeenCalledWith(
      "material_processing",
      materialProcessingHandler
    );
  });

  it("exposes only the authentication module public API through index.ts", async () => {
    const authenticationModule = await import("@/modules/authentication");

    expect(Object.keys(authenticationModule).sort()).toEqual([
      "authenticationModule",
      "buildAuthRepository",
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

    expect(Object.keys(userProfilesModule).sort()).toEqual(["userProfilesModule"]);
    expect(userProfilesModule.userProfilesModule).toEqual({
      name: "user-profiles"
    });
  });
});
