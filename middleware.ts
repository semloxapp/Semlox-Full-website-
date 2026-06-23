import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "./lib/supabase";

const PROTECTED_PATHS = ["/dashboard", "/dashboard/", "/dashboard/", "/dashboard"];
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 2;

function isProtected(pathname: string) {
  // Match /dashboard and any subpaths, and other protected prefixes
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/awb/") ||
    pathname.startsWith("/documents/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtected(pathname)) return NextResponse.next();

  try {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("semlox_session="));
    if (!match) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const cookieVal = match.split("=")[1] || "";
    let payload = null;
    try {
      const decoded = typeof globalThis.atob === "function" ? globalThis.atob(cookieVal) : Buffer.from(cookieVal, "base64").toString("utf8");
      payload = JSON.parse(decoded);
    } catch (e) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    let accessToken = payload?.access_token;
    const refreshToken = payload?.refresh_token;
    const expiresAt = Number(payload?.expires_at) || 0;

    // If access token expired or about to expire, attempt refresh
    const now = Date.now();
    const refreshBufferMs = 30 * 1000; // 30s buffer
    if ((!accessToken || now > expiresAt - refreshBufferMs) && refreshToken) {
      try {
        const tokenResp = await fetch(`${supabaseUrl}/auth/v1/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: supabaseAnonKey ?? "" },
          body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
        });
        const tokenData = await tokenResp.json().catch(() => ({}));
        if (tokenResp.ok && tokenData?.access_token) {
          accessToken = tokenData.access_token;
          const newRefresh = tokenData.refresh_token ?? refreshToken;
          const expiresIn = Number(tokenData.expires_in) || 3600;
          const newPayload = {
            access_token: accessToken,
            refresh_token: newRefresh,
            expires_at: Date.now() + expiresIn * 1000,
          };
          const cookieValue = typeof globalThis.btoa === "function" ? globalThis.btoa(JSON.stringify(newPayload)) : Buffer.from(JSON.stringify(newPayload)).toString("base64");
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

          const res = NextResponse.next();
          res.headers.set("Set-Cookie", cookieParts.join("; "));
          return res;
        }
      } catch (e) {
        // ignore and fallthrough to redirect
      }
    }

    if (!accessToken) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Validate token with Supabase user endpoint
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, apikey: supabaseAnonKey ?? "" },
    });
    if (!userResp.ok) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Allow request
    return NextResponse.next();
  } catch (e) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/awb/:path*", "/documents/:path*"],
};
