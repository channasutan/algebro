/**
 * Test environment setup.
 * 
 * This file runs before all tests to configure the test environment.
 */

// Set up test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-role-key";
process.env.AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || "test-ai-key";
process.env.MAYAR_API_KEY = process.env.MAYAR_API_KEY || "test-mayar-key";
process.env.MAYAR_WEBHOOK_SECRET = process.env.MAYAR_WEBHOOK_SECRET || "test-webhook-secret";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
