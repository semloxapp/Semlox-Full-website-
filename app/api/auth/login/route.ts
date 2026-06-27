import { NextResponse } from "next/server";
import { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } from "@/lib/supabase";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 2;
const isProduction = process.env.NODE_ENV === "production";

function authLoginLog(message: string, details?: Record<string, unknown>) {
  console.log(`[auth-login] ${message}`, details || {});
}

function encodeCookiePayload(payload: unknown) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function POST(request: Request) {
  authLoginLog("request received");
  authLoginLog("env check", {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
    hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || null,
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    authLoginLog("returning ok false", { code: "AUTH_SERVICE_ERROR", debugCode: "MISSING_AUTH_ENV" });
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Login service is currently unavailable. Please try again.", debugCode: isProduction ? undefined : "MISSING_AUTH_ENV" }, 500);
  }

  // Parse body safely and log presence of fields (never log values like password)
  const body = await request.json().catch(() => ({}));
  const email = body?.email ?? null;
  const password = body?.password ?? null;

  authLoginLog("field check", { emailProvided: Boolean(email), passwordProvided: Boolean(password) });

  if (!email) return jsonResponse({ ok: false, code: "MISSING_EMAIL", message: "Please enter your email address." }, 400);
  if (!password) return jsonResponse({ ok: false, code: "MISSING_PASSWORD", message: "Please enter your password." }, 400);

  try {
    // Call Supabase token endpoint with password grant server-side
    authLoginLog("calling Supabase password login");
    const resp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await resp.json().catch(() => ({}));

    authLoginLog("supabase sign-in result", {
      supabaseStatus: resp.status,
      supabaseErrorCode: data?.error || data?.code || null,
      sessionExists: Boolean(data && (data.access_token || data.refresh_token || data.session)),
      accessTokenExists: Boolean(data?.access_token),
      refreshTokenExists: Boolean(data?.refresh_token),
    });

    if (!resp.ok) {
      const errMsgRaw = String(data?.error_description || data?.error || data?.message || "Login failed");
      const errMsg = errMsgRaw.toLowerCase();

      if (/confirm/i.test(errMsg) || /verify/i.test(errMsg)) {
        authLoginLog("returning ok false", { code: "EMAIL_NOT_CONFIRMED" });
        return jsonResponse({ ok: false, code: "EMAIL_NOT_CONFIRMED", message: "Please verify your email address before signing in." }, 403);
      }

      if (/invalid|credentials|password/i.test(errMsg)) {
        authLoginLog("returning ok false", { code: "INVALID_CREDENTIALS" });
        return jsonResponse({ ok: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." }, 401);
      }

      // Map server errors
      if (resp.status >= 500) {
        authLoginLog("returning ok false", { code: "AUTH_SERVICE_ERROR", debugCode: "SUPABASE_SERVER_ERROR", status: resp.status });
        return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Login service is currently unavailable. Please try again." }, 500);
      }

      // Fallback: return invalid credentials to avoid leaking server details
      authLoginLog("returning ok false", { code: "INVALID_CREDENTIALS", debugCode: "SUPABASE_UNEXPECTED_AUTH_ERROR", status: resp.status });
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
      const cookieValue = encodeCookiePayload(cookiePayload);
      const maxAge = SESSION_COOKIE_MAX_AGE;
      const secure = isProduction;

      authLoginLog("cookie payload keys", { keys: Object.keys(cookiePayload) });
      authLoginLog("encoded cookie length", { length: cookieValue.length });
      authLoginLog("setting semlox_session cookie", {
        secure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });

      const response = NextResponse.json({ ok: true }, { status: 200 });
      response.cookies.set("semlox_session", cookieValue, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });

      // Do not return tokens in body. Return ok. Client can rely on cookie for subsequent requests.
      authLoginLog("cookie set success");
      authLoginLog("returning ok true");
      return response;
    } catch (e) {
      const debugCode = e instanceof Error && e.message === "COOKIE_ENCODER_UNAVAILABLE"
        ? "COOKIE_ENCODER_UNAVAILABLE"
        : "SESSION_COOKIE_CREATE_FAILED";
      authLoginLog("cookie error message", { message: e instanceof Error ? e.message : "Unknown cookie error" });
      authLoginLog("returning ok false", { code: "SESSION_COOKIE_ERROR", debugCode });
      return jsonResponse({ ok: false, code: "SESSION_COOKIE_ERROR", message: "Could not start your session. Please try again.", debugCode: isProduction ? undefined : debugCode }, 500);
    }
  } catch (e: unknown) {
    authLoginLog("returning ok false", {
      code: "AUTH_SERVICE_ERROR",
      debugCode: "AUTH_LOGIN_UNEXPECTED_ERROR",
      errorName: e instanceof Error ? e.name : null,
    });
    return jsonResponse({ ok: false, code: "AUTH_LOGIN_FAILED", message: "Could not start your session. Please try again.", debugCode: isProduction ? undefined : "AUTH_LOGIN_UNEXPECTED_ERROR" }, 500);
  }
}

export const runtime = "nodejs";
