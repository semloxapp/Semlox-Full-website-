import { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } from "./supabase";

type SupabaseUser = {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, any>;
};

export async function getUserFromAccessToken(accessToken: string | null): Promise<SupabaseUser | null> {
  if (!accessToken || !supabaseUrl) return null;

  // Use the anon key when validating an end-user access token.
  const apikey = supabaseAnonKey ?? "";

  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey,
    },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data as SupabaseUser;
}

export async function getMembershipsByUserId(userId: string) {
  if (!userId || !supabaseUrl || !supabaseServiceRoleKey) return [];

  // Return all memberships for the user (do not filter by accepted_at here).
  const url = `${supabaseUrl}/rest/v1/memberships?user_id=eq.${userId}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch memberships");
  }

  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

export async function getMembershipForUserAndCompany(userId: string, companyId: string) {
  if (!userId || !companyId || !supabaseUrl || !supabaseServiceRoleKey) return null;

  // Fetch membership for user and company without filtering by accepted_at.
  const url = `${supabaseUrl}/rest/v1/memberships?user_id=eq.${userId}&company_id=eq.${companyId}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return Array.isArray(data) && data.length ? data[0] : null;
}

export function extractBearerTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();

  // Fallback: check semlox_session cookie (server-set httpOnly cookie)
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("semlox_session="));
  if (!match) return null;
  const cookieVal = match.split("=")[1] || "";
  try {
    const decoded = typeof globalThis.atob === "function" ? globalThis.atob(cookieVal) : Buffer.from(cookieVal, "base64").toString("utf8");
    const payload = JSON.parse(decoded);
    // Check expiry
    const expiresAt = Number(payload?.expires_at) || 0;
    if (Date.now() > expiresAt) return null;
    return payload?.access_token ?? null;
  } catch (e) {
    return null;
  }
}
