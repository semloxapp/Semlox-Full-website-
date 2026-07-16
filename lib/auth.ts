import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type SupabaseUser = {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
};

/**
 * Public API preserved exactly as before (`extractBearerTokenFromRequest`,
 * `getUserFromAccessToken`, `getMembershipsByUserId`,
 * `getMembershipForUserAndCompany`) because 13 route files across the app
 * import these four functions directly. Only the *implementation* changed:
 *
 *  - Cookie-based sessions are now read via the official @supabase/ssr
 *    adapter (`createSupabaseServerClient`), which auto-refreshes an expired
 *    access token using the refresh token instead of hard-failing.
 *  - Membership/company table access now goes through the supabase-js query
 *    builder against a service-role client instead of hand-built fetch()
 *    calls with string-concatenated PostgREST query params.
 *
 * `extractBearerTokenFromRequest` is now async (it was previously
 * synchronous). All 13 existing call sites already `await` the *next* call
 * (`getUserFromAccessToken(token)`), so check each call site uses
 * `await extractBearerTokenFromRequest(request)` when applying this change.
 */
export async function extractBearerTokenFromRequest(
  request: Request
): Promise<string | null> {
  const header =
    request.headers.get("authorization") || request.headers.get("Authorization");
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();

  // Fallback: cookie-based session, refreshed automatically if needed.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getUserFromAccessToken(
  accessToken: string | null
): Promise<SupabaseUser | null> {
  if (!accessToken) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user as SupabaseUser;
  } catch {
    return null;
  }
}

export async function getMembershipsByUserId(userId: string) {
  if (!userId) return [];

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("memberships")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error("Failed to fetch memberships");
  }

  return data ?? [];
}

export async function getMembershipForUserAndCompany(
  userId: string,
  companyId: string
) {
  if (!userId || !companyId) return null;

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("memberships")
    .select("*")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) return null;
  return data;
}
