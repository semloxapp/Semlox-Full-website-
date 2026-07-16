import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/**
 * Sets the password for the currently active cookie session. Used by the
 * invite/recovery password-setup screen at /auth/callback: by the time this
 * is called, /api/auth/exchange or /api/auth/set-session has already
 * established a (short-lived, invite/recovery-scoped) cookie session, so no
 * access token needs to be held in browser JS at all.
 */
export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));

  if (!password || typeof password !== "string" || password.length < 8) {
    return jsonResponse(
      { ok: false, code: "WEAK_PASSWORD", message: "Password must be at least 8 characters." },
      400
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Password setup is unavailable. Please request a new invitation email.",
        },
        401
      );
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return jsonResponse({ ok: false, code: "PASSWORD_SET_FAILED", message: error.message }, 400);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    return jsonResponse(
      { ok: false, code: "PASSWORD_SET_FAILED", message: "Password could not be set. Please request a new invitation email." },
      500
    );
  }
}

export const runtime = "nodejs";
