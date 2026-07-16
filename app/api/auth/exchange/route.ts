import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return jsonResponse({ ok: false, code: "MISSING_CODE", message: "Missing code" }, 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return jsonResponse(
        { ok: false, code: "TOKEN_EXCHANGE_FAILED", message: error.message },
        400
      );
    }

    // Session cookie(s) are already set on this response by the Supabase
    // SDK. Deliberately NOT returning access_token in the body — the client
    // should rely on the cookie session (credentials: "include") for all
    // subsequent requests, not hold a copy of the token in JS-reachable
    // storage.
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    return jsonResponse({ ok: false, code: "EXCHANGE_FAILED", message: "Exchange failed" }, 500);
  }
}

export const runtime = "nodejs";
