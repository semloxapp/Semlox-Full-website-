import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST() {
  const route = "POST /api/auth/resolve-company-login";

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." },
        401
      );
    }

    const service = createSupabaseServiceClient();
    const { data: memberships, error: membershipsError } = await service
      .from("memberships")
      .select("company_id, role, accepted_at")
      .eq("user_id", user.id);

    if (membershipsError) throw membershipsError;

    if (!memberships || memberships.length === 0) {
      return jsonResponse(
        { ok: false, code: "NO_COMPANY_ACCOUNT", message: "No company account found for this email." },
        404
      );
    }

    // Filter to owner/admin roles. NOTE: preserved exactly as before —
    // owner/admin memberships are allowed here regardless of accepted_at.
    // This is a deliberate product decision worth confirming: an admin
    // invited but not yet "accepted" still gets in once they've completed
    // Supabase auth. See /api/auth/validate-company for the same rule.
    const allowed = memberships.filter((m) => {
      const role = (m.role || "").toLowerCase();
      return role === "owner" || role === "admin";
    });

    if (allowed.length === 0) {
      return jsonResponse(
        {
          ok: false,
          code: "NOT_COMPANY_ADMIN",
          message: "This login is only for company owners and admins. Please use User Sign In.",
        },
        403
      );
    }

    const companyIds = Array.from(new Set(allowed.map((m) => m.company_id))).filter(Boolean);
    if (companyIds.length === 0) {
      return jsonResponse(
        { ok: false, code: "NO_COMPANY_ACCOUNT", message: "No company account found for this email." },
        404
      );
    }

    const { data: companies, error: companiesError } = await service
      .from("companies")
      .select("id, name, contact_email")
      .in("id", companyIds);

    if (companiesError) throw companiesError;

    const preferred = (companies ?? []).find(
      (c) =>
        c.contact_email &&
        String(c.contact_email).toLowerCase() === String(user.email || "").toLowerCase()
    );

    if (preferred) {
      const membership = allowed.find((m) => m.company_id === preferred.id) || allowed[0];
      return jsonResponse(
        { ok: true, companyId: preferred.id, role: membership.role, company: preferred },
        200
      );
    }

    if (companies && companies.length === 1) {
      const comp = companies[0];
      const membership = allowed.find((m) => m.company_id === comp.id) || allowed[0];
      return jsonResponse({ ok: true, companyId: comp.id, role: membership.role, company: comp }, 200);
    }

    const payload = (companies ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      contact_email: c.contact_email,
    }));
    return jsonResponse({ ok: true, requiresCompanySelection: true, companies: payload }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Resolve company failed" }, 500);
  }
}

export const runtime = "nodejs";
