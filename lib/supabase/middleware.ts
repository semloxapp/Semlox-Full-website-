import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

/**
 * Refreshes the Supabase session (if needed) for the given request and
 * returns the resulting response plus the authenticated user (or null).
 *
 * This replaces the old middleware.ts's hand-rolled decode/refresh/re-encode
 * logic. Calling `supabase.auth.getUser()` transparently refreshes an
 * expired access token using the refresh token and calls `setAll` with the
 * new cookies, which we mirror onto both the outgoing request (so downstream
 * Route Handlers see the fresh session) and the response (so the browser
 * receives the updated Set-Cookie).
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
