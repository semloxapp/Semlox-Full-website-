import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

function isProtectedPage(pathname: string) {
  // Only /dashboard and its subpaths exist as protected pages in this app.
  // (The previous matcher also listed /settings/*, /awb/*, /documents/* as
  // top-level paths, but those routes don't exist outside of
  // /dashboard/settings, /dashboard/awb, /dashboard/history — that was dead
  // code and has been removed.)
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export async function middleware(request: NextRequest) {
  // Refreshes the Supabase session (access + refresh token) for *every*
  // matched request — including /api/* calls, not just page navigations.
  // This is what actually fixes the "logged out after ~1 hour of using the
  // AWB review screen" issue: previously only full page loads went through
  // middleware, so a session that expired mid-session (all client fetches,
  // no navigation) had no chance to refresh until the next page load.
  const { supabaseResponse, user } = await updateSupabaseSession(request);

  if (isProtectedPage(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // API routes still perform their own 401 handling if unauthenticated;
  // middleware's job here is only to keep the session cookie fresh for them.
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
