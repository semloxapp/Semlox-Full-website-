import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createNotificationsSafely, getCompanyName, getUserLabel } from "@/lib/notifications";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function POST(request: Request) {
  const route = "POST /api/auth/accept-invite";
  const { companyId } = await request.json().catch(() => ({}));

  if (!companyId) {
    return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Please select a company." }, 400);
  }
  if (!uuidRegex.test(companyId)) {
    return jsonResponse({ ok: false, code: "MISSING_COMPANY", message: "Invalid company." }, 400);
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

    // Scoped update — never touches any other pending membership row for
    // this user. Matches the original invariant exactly, just expressed
    // through the query builder instead of a raw PATCH with string filters.
    const { data: updated, error: updateError } = await service
      .from("memberships")
      .update({ accepted_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .select();

    if (updateError) throw updateError;

    if (!updated || updated.length === 0) {
      return jsonResponse(
        { ok: false, code: "INVITE_NOT_FOUND", message: "No pending invite found for this company." },
        404
      );
    }

    const companyName = (await getCompanyName(companyId)) || "the workspace";
    const userLabel = (await getUserLabel(user.id)) || user.email || "A team member";

    await createNotificationsSafely(
      [
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
      ],
      "accept-invite"
    );

    return jsonResponse({ ok: true, updated: updated.length, rows: updated }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Accept invite failed" }, 500);
  }
}

export const runtime = "nodejs";
