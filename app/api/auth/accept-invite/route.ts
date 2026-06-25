import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
import { createNotificationsSafely, getCompanyName, getUserLabel } from "@/lib/notifications";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: Request) {
  const route = "POST /api/auth/accept-invite";
  if (!supabaseUrl || !supabaseServiceRoleKey) return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);

  const token = extractBearerTokenFromRequest(request);
  if (!token) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

  const { companyId } = await request.json().catch(() => ({}));
  if (!companyId) return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Please select a company." }, 400);

  // validate companyId is a UUID
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(companyId)) return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Invalid company." }, 400);

  try {
    const user = await getUserFromAccessToken(token);
    if (!user || !user.id) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

    // Verify there's a pending membership for this specific user+company
    const lookupUrl = `${supabaseUrl}/rest/v1/memberships?user_id=eq.${user.id}&company_id=eq.${companyId}&accepted_at=is.null`;
    const lookup = await fetch(lookupUrl, {
      method: "GET",
      headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
    });
    if (!lookup.ok) {
      const body = await lookup.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") console.log(route, "lookup failed", { userId: user.id, companyId, status: lookup.status, body });
      return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Failed to lookup membership" }, lookup.status);
    }
    const rows = await lookup.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse({ ok: false, code: "INVITE_NOT_FOUND", message: "No pending invite found for this company." }, 404);
    }

    if (process.env.NODE_ENV !== "production") console.log("[accept-invite] user", user.id, "company", companyId, "pendingRows", rows.length);

    // Update only that membership row (primary key company_id,user_id)
    const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?user_id=eq.${user.id}&company_id=eq.${companyId}&accepted_at=is.null`, {
      method: "PATCH",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ accepted_at: new Date().toISOString() }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") console.log(route, "patch failed", { status: resp.status, body });
      return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Failed to accept invite" }, resp.status);
    }

    const data = await resp.json().catch(() => []);
    const companyName = (await getCompanyName(companyId)) || "the workspace";
    const userLabel = (await getUserLabel(user.id)) || user.email || "A team member";
    await createNotificationsSafely([
        {
          companyId,
          audience: "company_admins",
          type: "invite_accepted",
          category: "team",
          severity: "success",
          title: "Invitation accepted",
          message: `${userLabel} accepted the workspace invitation.`,
          data: { href: "/dashboard/settings" },
        },
        {
          companyId,
          userId: user.id,
          audience: "user",
          type: "welcome",
          category: "workspace",
          severity: "success",
          title: "Welcome to the workspace",
          message: `You have joined ${companyName}.`,
          data: { href: "/dashboard" },
        },
      ], "accept-invite");
    return jsonResponse({ ok: true, updated: Array.isArray(data) ? data.length : 0, rows: data }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Accept invite failed" }, 500);
  }
}

export const runtime = "edge";
