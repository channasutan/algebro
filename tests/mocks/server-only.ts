/**
 * Vitest mock for the "server-only" Next.js boundary module.
 *
 * This empty module allows Node-based test environments to resolve
 * the "server-only" import used by server-only modules.
 *
 * In production builds, the actual server-only package throws an error
 * when imported in browser contexts. This mock bypasses that behavior
 * for testing purposes only.
 */
// Mock module used by Vitest to resolve Next.js "server-only" imports in tests.
export default {};
