import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/**
 * Used only by the legacy implicit/hash auth flow — Supabase invite/magic
 * link emails that return `#access_token=...&refresh_token=...` in the URL
 * fragment instead of a PKCE `?code=`. Establishes the same httpOnly cookie
 * session as /login and /exchange, so the app never has to hold a raw token
 * in sessionStorage.
 *
 * Prefer configuring the Supabase project's Auth email templates to use the
 * PKCE flow (redirect links with `?code=`) so this route becomes
 * unnecessary — /api/auth/exchange already covers that flow.
 */
export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json().catch(() => ({}));

  if (!access_token || !refresh_token) {
    return jsonResponse(
      { ok: false, code: "MISSING_TOKENS", message: "Missing session tokens." },
      400
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      return jsonResponse({ ok: false, code: "SESSION_SET_FAILED", message: error.message }, 400);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    return jsonResponse(
      { ok: false, code: "SESSION_SET_FAILED", message: "Could not start your session." },
      500
    );
  }
}

export const runtime = "nodejs";
