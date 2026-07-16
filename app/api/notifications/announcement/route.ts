import { extractBearerTokenFromRequest, getMembershipForUserAndCompany, getMembershipsByUserId, getUserFromAccessToken } from "@/lib/auth";
import { createNotification, isUuid, jsonResponse } from "@/lib/notifications";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";

const allowedSeverities = new Set(["info", "success", "warning", "error"]);

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable." }, 500);
  }

  const token = await extractBearerTokenFromRequest(request);
  if (!token) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }
  const user = await getUserFromAccessToken(token);
  if (!user?.id) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const title = normalizeText(body?.title, 120);
  const message = normalizeText(body?.message, 500);
  const severity = normalizeText(body?.severity, 20).toLowerCase() || "info";
  const requestedCompanyId = typeof body?.companyId === "string" ? body.companyId : null;

  if (!title || !message) {
    return jsonResponse({ ok: false, code: "MISSING_FIELDS", message: "Please enter an announcement title and message." }, 400);
  }
  if (!allowedSeverities.has(severity)) {
    return jsonResponse({ ok: false, code: "INVALID_SEVERITY", message: "Please select a valid announcement severity." }, 400);
  }
  if (requestedCompanyId && !isUuid(requestedCompanyId)) {
    return jsonResponse({ ok: false, code: "INVALID_COMPANY", message: "Invalid company." }, 400);
  }

  try {
    let companyId = requestedCompanyId;
    if (!companyId) {
      const memberships = await getMembershipsByUserId(user.id);
      const managed = memberships.filter((membership) => {
        const role = String(membership?.role || "").toLowerCase();
        return Boolean(membership?.accepted_at) && (role === "owner" || role === "admin");
      });
      if (managed.length === 1) companyId = String(managed[0].company_id);
    }
    if (!companyId) {
      return jsonResponse({ ok: false, code: "COMPANY_REQUIRED", message: "Please select a company." }, 400);
    }

    const membership = await getMembershipForUserAndCompany(user.id, companyId);
    const role = String(membership?.role || "").toLowerCase();
    if (!membership?.accepted_at || (role !== "owner" && role !== "admin")) {
      return jsonResponse({ ok: false, code: "FORBIDDEN", message: "Only owners and admins can send announcements." }, 403);
    }

    const result = await createNotification({
      companyId,
      audience: "company_members",
      type: "workspace_announcement",
      category: "workspace",
      severity: severity as "info" | "success" | "warning" | "error",
      title,
      message,
    });
    if (!result.ok) {
      return jsonResponse({ ok: false, code: "ANNOUNCEMENT_FAILED", message: "Unable to send announcement. Please try again." }, 500);
    }
    return jsonResponse({ ok: true, message: "Announcement sent." }, 200);
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[notification-announcement] failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return jsonResponse({ ok: false, code: "ANNOUNCEMENT_FAILED", message: "Unable to send announcement. Please try again." }, 500);
  }
}
