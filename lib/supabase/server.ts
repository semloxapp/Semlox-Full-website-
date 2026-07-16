import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

/**
 * Creates a Supabase client for use inside Route Handlers and Server
 * Components. It reads/writes the *real* Supabase session cookies via the
 * official @supabase/ssr adapter, so:
 *
 *  - `supabase.auth.getUser()` / `getSession()` automatically refreshes an
 *    expired access token using the stored refresh token, and re-persists the
 *    refreshed cookies on the response — no hand-rolled expiry bookkeeping.
 *  - `supabase.auth.signInWithPassword()`, `.signOut()`, `.exchangeCodeForSession()`,
 *    and `.setSession()` all manage the cookie(s) for you.
 *
 * NOTE: cookies() is only mutable inside Route Handlers and Server Actions.
 * If this is called from a Server Component render, `setAll` will throw and
 * is safely swallowed below — middleware is responsible for refreshing the
 * session before the render happens in that case.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore because
          // middleware.ts refreshes the session on every request before any
          // Server Component renders.
        }
      },
    },
  });
}
