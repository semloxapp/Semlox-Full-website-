import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceRoleKey } from "@/lib/supabase";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client authenticated with the service role key.
 * Bypasses RLS — never import this from client code or expose its result to
 * the browser. Used for membership/company lookups and other privileged
 * backend operations that previously used raw `fetch()` calls to PostgREST
 * with manually concatenated query strings.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase service role client is not configured.");
  }

  if (cachedClient) return cachedClient;

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
