import { extractBearerTokenFromRequest, getUserFromAccessToken, getMembershipsByUserId } from "@/lib/auth";
import { supabaseUrl, supabaseServiceRoleKey } from "@/lib/supabase";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(request: Request) {
  const route = "POST /api/auth/resolve-company-login";
  if (!supabaseUrl || !supabaseServiceRoleKey) return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);

  const token = extractBearerTokenFromRequest(request);
  if (!token) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

  try {
    const user = await getUserFromAccessToken(token);
    if (!user || !user.id) return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);

    const memberships = await getMembershipsByUserId(user.id);
    if (!Array.isArray(memberships) || memberships.length === 0) {
      return jsonResponse({ ok: false, code: "NO_COMPANY_ACCOUNT", message: "No company account found for this email." }, 404);
    }

    // Filter to owner/admin roles
    const allowed = memberships.filter((m: any) => {
      const role = (m.role || "").toLowerCase();
      return role === "owner" || role === "admin";
    });

    if (allowed.length === 0) {
      return jsonResponse({ ok: false, code: "NOT_COMPANY_ADMIN", message: "This login is only for company owners and admins. Please use User Sign In." }, 403);
    }

    // Collect company IDs
    const companyIds = Array.from(new Set(allowed.map((m: any) => m.company_id))).filter(Boolean);
    if (companyIds.length === 0) return jsonResponse({ ok: false, code: "NO_COMPANY_ACCOUNT", message: "No company account found for this email." }, 404);

    // Fetch company rows
    const resp = await fetch(`${supabaseUrl}/rest/v1/companies?id=in.(${companyIds.join(",")})`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    });

    const companies = (await resp.json()) || [];

    // Prefer company matching contact_email
    const preferred = companies.find((c: any) => {
      if (!c) return false;
      if (!c.contact_email) return false;
      return String(c.contact_email).toLowerCase() === String(user.email || "").toLowerCase();
    });

    if (preferred) {
      const membership = allowed.find((m: any) => m.company_id === preferred.id) || allowed[0];
      return jsonResponse({ ok: true, companyId: preferred.id, role: membership.role, company: preferred }, 200);
    }

    if (companies.length === 1) {
      const comp = companies[0];
      const membership = allowed.find((m: any) => m.company_id === comp.id) || allowed[0];
      return jsonResponse({ ok: true, companyId: comp.id, role: membership.role, company: comp }, 200);
    }

    // Multiple companies: return list for selection
    const payload = companies.map((c: any) => ({ id: c.id, name: c.name, contact_email: c.contact_email }));
    return jsonResponse({ ok: true, requiresCompanySelection: true, companies: payload }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Resolve company failed" }, 500);
  }
}

export const runtime = "edge";
