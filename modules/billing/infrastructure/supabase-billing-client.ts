import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingClient = SupabaseClient;

/**
 * Identity factory — accepts an already-constructed Supabase client.
 * The lib/ layer (billing-service.ts) is responsible for constructing
 * and injecting the client; this module layer stays clean of lib/ imports.
 */
export function createBillingClient(client: BillingClient): BillingClient {
  return client;
}
