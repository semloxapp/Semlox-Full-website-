import { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } from "@/lib/supabase";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

export async function POST(request: Request) {
  const routeName = "POST /api/auth/login";
  if (!supabaseUrl || !supabaseAnonKey) return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Login service is currently unavailable. Please try again." }, 500);

  // Parse body safely and log presence of fields (never log values like password)
  const body = await request.json().catch(() => ({}));
  const email = body?.email ?? null;
  const password = body?.password ?? null;

  if (process.env.NODE_ENV !== "production") console.log("[auth-login] request received", { emailProvided: Boolean(email), passwordProvided: Boolean(password) });

  if (!email) return jsonResponse({ ok: false, code: "MISSING_EMAIL", message: "Please enter your email address." }, 400);
  if (!password) return jsonResponse({ ok: false, code: "MISSING_PASSWORD", message: "Please enter your password." }, 400);

  try {
    // Call Supabase token endpoint with password grant server-side
    if (process.env.NODE_ENV !== "production") console.log("[auth-login] calling Supabase password login");
    const resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json().catch(() => ({}));

    // Safe dev logging (do NOT log tokens or password)
    if (process.env.NODE_ENV !== "production") {
      console.log(routeName, {
        supabaseStatus: resp.status,
        supabaseError: data?.error_description || data?.error || data?.message,
        sessionReceived: Boolean(data && (data.access_token || data.refresh_token || data.session)),
        accessTokenExists: Boolean(data?.access_token),
        refreshTokenExists: Boolean(data?.refresh_token),
      });
    }

    if (!resp.ok) {
      const errMsgRaw = String(data?.error_description || data?.error || data?.message || "Login failed");
      const errMsg = errMsgRaw.toLowerCase();

      if (/confirm/i.test(errMsg) || /verify/i.test(errMsg)) {
        if (process.env.NODE_ENV !== "production") console.log("[auth-login] supabase reports unconfirmed email");
        return jsonResponse({ ok: false, code: "EMAIL_NOT_CONFIRMED", message: "Please verify your email address before signing in." }, 403);
      }

      if (/invalid|credentials|password/i.test(errMsg)) {
        if (process.env.NODE_ENV !== "production") console.log("[auth-login] supabase reports invalid credentials");
        return jsonResponse({ ok: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." }, 401);
      }

      // Map server errors
      if (resp.status >= 500) {
        if (process.env.NODE_ENV !== "production") console.log("[auth-login] supabase server error", { status: resp.status });
        return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Login service is currently unavailable. Please try again." }, 500);
      }

      // Fallback: return invalid credentials to avoid leaking server details
      if (process.env.NODE_ENV !== "production") console.log("[auth-login] supabase returned unexpected error", { status: resp.status, body: data });
      return jsonResponse({ ok: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." }, 401);
    }

    const accessToken = data?.access_token ?? null;
    const refreshToken = data?.refresh_token ?? null;
    const expiresIn = Number(data?.expires_in) || 3600;

    const cookiePayload = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + expiresIn * 1000,
    };

    try {
      const cookieValue = typeof globalThis.btoa === "function" ? globalThis.btoa(JSON.stringify(cookiePayload)) : Buffer.from(JSON.stringify(cookiePayload)).toString("base64");
      const maxAge = SESSION_COOKIE_MAX_AGE;
      const secure = process.env.NODE_ENV === "production";
      const cookieParts = [
        `semlox_session=${cookieValue}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=${maxAge}`,
      ];
      if (secure) cookieParts.push("Secure");

      if (process.env.NODE_ENV !== "production") console.log("[auth-login] setting semlox_session cookie (not logging value)");

      const headers = new Headers();
      headers.set("Set-Cookie", cookieParts.join("; "));

      // Do not return tokens in body. Return ok. Client can rely on cookie for subsequent requests.
      if (process.env.NODE_ENV !== "production") console.log("[auth-login] login successful, returning ok:true");
      return new Response(JSON.stringify({ ok: true }), { headers, status: 200 });
    } catch (e) {
      const message = e instanceof Error ? e.message : e;
      if (process.env.NODE_ENV !== "production") console.log("[auth-login] failed to create session cookie", message);
      return jsonResponse({ ok: false, code: "SESSION_COOKIE_ERROR", message: "Could not start your session. Please try again." }, 500);
    }
  } catch (e: any) {
    if (process.env.NODE_ENV !== "production") console.log(routeName, "unexpected error", e?.message || e);
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Something went wrong while signing in. Please try again." }, 500);
  }
}

export const runtime = "edge";
