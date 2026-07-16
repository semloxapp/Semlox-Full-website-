import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const route = "POST /api/auth/validate-company";
  const { companyId } = await request.json().catch(() => ({}));

  if (!companyId) {
    return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Please select a company." }, 400);
  }

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
    const { data: membership, error: membershipError } = await service
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return jsonResponse(
        { ok: false, code: "NOT_COMPANY_MEMBER", message: "You are not a member of this company." },
        403
      );
    }

    // Preserved exactly: owner/admin are allowed through even if
    // accepted_at is null; regular roles require an accepted invite.
    const role = String(membership.role || "").toLowerCase();
    const isAccepted = !!membership.accepted_at;
    if (!isAccepted && role !== "owner" && role !== "admin") {
      return jsonResponse(
        {
          ok: false,
          code: "INVITE_NOT_ACCEPTED",
          message: "Your company invitation has not been accepted yet. Please open your invitation email.",
        },
        403
      );
    }

    return jsonResponse({ ok: true, membership }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Validation failed" }, 500);
  }
}

export const runtime = "nodejs";
