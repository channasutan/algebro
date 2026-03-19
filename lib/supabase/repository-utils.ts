import "server-only";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

/**
 * Common error handler for database operations.
 */
function handleDbError(error: PostgrestError, context: string): never {
  throw new Error(`[${context}] ${error.message}`, { cause: error });
}

/**
 * Generic helper for Supabase select operations.
 */
export async function dbSelect<T>(
  client: SupabaseClient,
  table: string,
  options: {
    columns?: string;
    filters?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    single?: boolean;
    maybeSingle?: boolean;
    context: string;
  }
): Promise<T> {
  let query = client.from(table).select(options.columns || "*");

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query = query.eq(key, value);
    }
  }

  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending });
  }

  if (options.single) {
    const { data, error } = await query.single();
    if (error) handleDbError(error, options.context);
    return data as T;
  }

  if (options.maybeSingle) {
    const { data, error } = await query.maybeSingle();
    if (error) handleDbError(error, options.context);
    return data as T;
  }

  const { data, error } = await query;
  if (error) handleDbError(error, options.context);
  return (data || []) as unknown as T;
}

/**
 * Generic helper for Supabase insert operations.
 */
export async function dbInsert<T>(
  client: SupabaseClient,
  table: string,
  values: Record<string, unknown>,
  options: {
    columns?: string;
    context: string;
    errorFactory?: (error: PostgrestError) => Error;
  }
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .insert(values)
    .select(options.columns || "*")
    .single();

  if (error) {
    if (options.errorFactory) throw options.errorFactory(error);
    handleDbError(error, options.context);
  }
  return data as T;
}

/**
 * Generic helper for Supabase update operations.
 */
export async function dbUpdate<T>(
  client: SupabaseClient,
  table: string,
  id: string | number,
  values: Record<string, unknown>,
  options: {
    columns?: string;
    context: string;
    errorFactory?: (error: PostgrestError) => Error;
  }
): Promise<T> {
  const { data, error } = await client
    .from(table)
    .update(values)
    .eq("id", id)
    .select(options.columns || "*")
    .single();

  if (error) {
    if (options.errorFactory) throw options.errorFactory(error);
    handleDbError(error, options.context);
  }
  
  return data as T;
}
