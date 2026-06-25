import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { extractBearerTokenFromRequest, getUserFromAccessToken, getMembershipForUserAndCompany } from "@/lib/auth";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: Request) {
  const route = "POST /api/auth/validate-company";
  if (!supabaseUrl || !supabaseServiceRoleKey) return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);

  const token = extractBearerTokenFromRequest(request);
  if (!token) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

  const { companyId } = await request.json().catch(() => ({}));
  if (!companyId) return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Please select a company." }, 400);

  try {
    const user = await getUserFromAccessToken(token);
    if (!user || !user.id) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

    // Ensure the user has a membership for the requested company.
    const membership = await getMembershipForUserAndCompany(user.id, companyId);
    if (!membership) {
      return jsonResponse({ ok: false, code: "NOT_COMPANY_MEMBER", message: "You are not a member of this company." }, 403);
    }

    // If the membership is not yet accepted, allow owner/admins but require
    // acceptance for regular roles.
    const role = String(membership.role || "").toLowerCase();
    const isAccepted = !!membership.accepted_at;
    if (!isAccepted && role !== "owner" && role !== "admin") {
      return jsonResponse({ ok: false, code: "INVITE_NOT_ACCEPTED", message: "Your company invitation has not been accepted yet. Please open your invitation email." }, 403);
    }

    // Return membership info (role etc.) so the client can proceed.
    return jsonResponse({ ok: true, membership }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Validation failed" }, 500);
  }
}

export const runtime = "edge";
