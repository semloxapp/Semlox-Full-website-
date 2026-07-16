import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  const route = "GET /api/auth/memberships";

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
    const { data, error } = await service
      .from("memberships")
      .select("company_id, role, accepted_at")
      .eq("user_id", user.id);

    if (error) throw error;

    return jsonResponse({ ok: true, memberships: data ?? [] }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log(route, "error", err?.message || err);
    return jsonResponse(
      { ok: false, code: "AUTH_SERVICE_ERROR", message: "Failed to fetch memberships" },
      500
    );
  }
}

export const runtime = "nodejs";
