import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body?.email ?? null;
  const password = body?.password ?? null;

  if (!email) {
    return jsonResponse(
      { ok: false, code: "MISSING_EMAIL", message: "Please enter your email address." },
      400
    );
  }
  if (!password) {
    return jsonResponse(
      { ok: false, code: "MISSING_PASSWORD", message: "Please enter your password." },
      400
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes("confirm") || message.includes("verify")) {
        return jsonResponse(
          {
            ok: false,
            code: "EMAIL_NOT_CONFIRMED",
            message: "Please verify your email address before signing in.",
          },
          403
        );
      }

      if (message.includes("invalid") || message.includes("credentials")) {
        return jsonResponse(
          { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
          401
        );
      }

      return jsonResponse(
        {
          ok: false,
          code: "AUTH_SERVICE_ERROR",
          message: "Login service is currently unavailable. Please try again.",
        },
        500
      );
    }

    // The Supabase SDK already wrote the session cookie(s) to this response
    // via the cookie adapter configured in createSupabaseServerClient().
    // No tokens are returned in the response body.
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    return jsonResponse(
      {
        ok: false,
        code: "AUTH_LOGIN_FAILED",
        message: "Could not start your session. Please try again.",
      },
      500
    );
  }
}

export const runtime = "nodejs";
