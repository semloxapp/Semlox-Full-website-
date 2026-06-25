import { extractBearerTokenFromRequest, getUserFromAccessToken, getMembershipsByUserId } from "@/lib/auth";
import { supabaseUrl, supabaseServiceRoleKey } from "@/lib/supabase";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request: Request) {
  const route = "GET /api/auth/memberships";
  const token = extractBearerTokenFromRequest(request);
  if (!token) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

  try {
    const user = await getUserFromAccessToken(token);
    if (!user || !user.id) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

    const memberships = await getMembershipsByUserId(user.id);
    // Ensure we return only the fields needed by the client
    const sanitized = Array.isArray(memberships)
      ? memberships.map((m: any) => ({ company_id: m.company_id, role: m.role, accepted_at: m.accepted_at }))
      : [];
    return jsonResponse({ ok: true, memberships: sanitized }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Failed to fetch memberships" }, 500);
  }
}

export const runtime = "edge";
