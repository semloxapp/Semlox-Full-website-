import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) return new Response(JSON.stringify({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });

  const { code } = await request.json().catch(() => ({}));
  if (!code || typeof code !== "string") return new Response(JSON.stringify({ ok: false, code: "MISSING_CODE", message: "Missing code" }), { status: 400, headers: { "Content-Type": "application/json" } });

  try {
    // Build form body for token exchange
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    // If the deploy has a configured public site URL, include redirect_uri to match the code
    const redirectBase = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL;
    if (redirectBase) {
      params.set("redirect_uri", `${redirectBase.replace(/\/$/, "")}/auth/callback`);
    }

    const resp = await fetch(`${supabaseUrl}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: supabaseAnonKey ?? "",
      },
      body: params.toString(),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return new Response(JSON.stringify({ ok: false, code: "TOKEN_EXCHANGE_FAILED", message: data?.error_description || data?.error || "Token exchange failed" }), { status: resp.status, headers: { "Content-Type": "application/json" } });

    // data contains access_token, refresh_token, expires_in
    const accessToken = data?.access_token ?? null;
    const refreshToken = data?.refresh_token ?? null;
    const expiresIn = Number(data?.expires_in) || 3600;

    // Build a small server-only cookie payload and set as HttpOnly cookie.
    const cookiePayload = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + expiresIn * 1000,
    };
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

    const headers = new Headers();
    headers.set("Set-Cookie", cookieParts.join("; "));

    // Return success and include access_token only so client can set sessionStorage as a temporary fallback.
    return new Response(JSON.stringify({ ok: true, access_token: accessToken }), { headers, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, code: "EXCHANGE_FAILED", message: "Exchange failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export const runtime = "edge";
