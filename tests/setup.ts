/**
 * Test setup for Supabase-related tests.
 *
 * Sets only the required Supabase environment variables globally.
 * AI and Mayar variables should be set in tests that specifically require them.
 */

// Use ??= to avoid overriding empty strings with defaults
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
