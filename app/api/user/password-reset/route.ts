import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
import { createNotificationsSafely, getUserNotificationCompanyId } from "@/lib/notifications";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRedirectTo() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000") + "/auth/callback";
}

function createSupabaseAuthClient() {
  return createClient(supabaseUrl || "", supabaseServiceRoleKey || "", {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);
  }

  const token = extractBearerTokenFromRequest(request);
  if (!token) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  const user = await getUserFromAccessToken(token);
  if (!user?.id || !user.email) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  try {
    const supabaseAuth = createSupabaseAuthClient();
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(user.email, {
      redirectTo: getRedirectTo(),
    });
    if (error) {
      if (process.env.NODE_ENV !== "production") console.log("[user-password-reset] failed", { message: error.message });
      return jsonResponse({ ok: false, code: "PASSWORD_RESET_FAILED", message: "Unable to send password reset email. Please try again." }, 500);
    }
    const companyId = await getUserNotificationCompanyId(user.id);
    await createNotificationsSafely([
      {
        companyId,
        userId: user.id,
        audience: "user",
        type: "password_reset_requested",
        category: "security",
        severity: "warning",
        title: "Password reset requested",
        message: "A password reset email was sent for your account.",
        data: { href: "/dashboard/settings" },
      },
    ], "user-password-reset");
    return jsonResponse({ ok: true, message: "Password reset email sent." }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-password-reset] request failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "PASSWORD_RESET_FAILED", message: "Unable to send password reset email. Please try again." }, 500);
  }
}
