/**
 * Vitest mock for the "client-only" Next.js boundary module.
 *
 * This empty module allows Node-based test environments to resolve
 * the "client-only" import used by browser-only modules.
 *
 * In production builds, the actual client-only package throws an error
 * when imported in server contexts. This mock bypasses that behavior
 * for testing purposes only.
 */
// Mock module used by Vitest to resolve Next.js "client-only" imports in tests.
export default {};
