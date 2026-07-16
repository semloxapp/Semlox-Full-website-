import { extractBearerTokenFromRequest, getMembershipsByUserId, getUserFromAccessToken } from "@/lib/auth";
import { createNotificationsSafely, getUserNotificationCompanyId } from "@/lib/notifications";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";

type ServiceResult = {
  ok: boolean;
  status: number;
  data: any;
};

const SAFE_PROFILE_FIELDS = [
  "full_name",
  "job_title",
  "phone",
  "avatar_url",
  "city",
  "country",
  "timezone",
] as const;

const defaultNotifications = {
  awb_processed: true,
  processing_failures: true,
  mentions: true,
  weekly_summary: false,
  in_app_notifications: true,
};

const MAX_FIELD_LENGTH: Record<string, number> = {
  full_name: 160,
  job_title: 120,
  phone: 60,
  city: 80,
  country: 80,
  timezone: 80,
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function serviceHeaders() {
  return {
    apikey: supabaseServiceRoleKey as string,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function authenticate(request: Request) {
  const token = await extractBearerTokenFromRequest(request);
  if (!token) return null;
  return await getUserFromAccessToken(token);
}

function normalizeText(value: unknown, maxLength: number) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxLength);
}

function buildFullName(body: any) {
  const explicit = normalizeText(body?.full_name, MAX_FIELD_LENGTH.full_name);
  if (explicit !== undefined) return explicit;

  const firstName = normalizeText(body?.first_name, 80);
  const lastName = normalizeText(body?.last_name, 80);
  if (firstName === undefined && lastName === undefined) return undefined;
  return [firstName || "", lastName || ""].join(" ").trim().slice(0, MAX_FIELD_LENGTH.full_name);
}

function sanitizeProfilePatch(body: any) {
  const patch: Record<string, string | null> = {};
  const fullName = buildFullName(body);
  if (fullName !== undefined) patch.full_name = fullName;

  for (const field of SAFE_PROFILE_FIELDS) {
    if (field === "full_name" || !(field in (body || {}))) continue;
    const normalized = normalizeText(body[field], MAX_FIELD_LENGTH[field] || 160);
    if (normalized !== undefined) patch[field] = normalized;
  }

  return patch;
}

function pickProfile(row: any) {
  const source = row && typeof row === "object" ? row : {};
  const metadata = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
    ? source.metadata
    : {};
  const sourceNotifications = metadata.notifications && typeof metadata.notifications === "object" && !Array.isArray(metadata.notifications)
    ? metadata.notifications
    : {};
  const notifications = { ...defaultNotifications };
  for (const key of Object.keys(defaultNotifications) as Array<keyof typeof defaultNotifications>) {
    if (typeof sourceNotifications[key] === "boolean") notifications[key] = sourceNotifications[key];
  }

  return {
    full_name: source.full_name || "",
    job_title: source.job_title || "",
    phone: source.phone || "",
    avatar_url: source.avatar_url || "",
    city: source.city || "",
    country: source.country || "",
    timezone: source.timezone || "",
    notifications,
  };
}

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
  };
}

function unsupportedColumnFromError(data: any) {
  const text = `${data?.message || ""} ${data?.details || ""} ${data?.hint || ""}`;
  const match =
    text.match(/Could not find the '([^']+)' column/i) ||
    text.match(/column "([^"]+)"/i) ||
    text.match(/'([^']+)' column/i);
  return match?.[1] || null;
}

async function fetchProfile(userId: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  const data = await resp.json().catch(() => []);
  return {
    ok: resp.ok,
    status: resp.status,
    data: Array.isArray(data) ? data[0] || null : null,
    raw: data,
  };
}

async function writeProfile(userId: string, patch: Record<string, string | null>): Promise<ServiceResult> {
  const existing = await fetchProfile(userId);
  const exists = Boolean(existing.data);
  let payload: Record<string, string | null> = exists ? { ...patch } : { id: userId, ...patch };

  for (let attempt = 0; attempt < SAFE_PROFILE_FIELDS.length + 2; attempt += 1) {
    const url = exists
      ? `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`
      : `${supabaseUrl}/rest/v1/profiles?select=*`;
    const resp = await fetch(url, {
      method: exists ? "PATCH" : "POST",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (resp.ok) {
      return { ok: true, status: resp.status, data: Array.isArray(data) ? data[0] || null : data };
    }

    const unsupportedColumn = unsupportedColumnFromError(data);
    if (unsupportedColumn && unsupportedColumn !== "id" && unsupportedColumn in payload) {
      const nextPayload = { ...payload };
      delete nextPayload[unsupportedColumn];
      payload = nextPayload;
      continue;
    }

    return { ok: false, status: resp.status, data };
  }

  return { ok: false, status: 500, data: null };
}

async function fetchWorkspace(userId: string, companyId?: string | null) {
  const memberships = await getMembershipsByUserId(userId);
  const selected =
    (companyId ? memberships.find((membership: any) => membership.company_id === companyId) : null) ||
    memberships.find((membership: any) => membership.accepted_at) ||
    memberships[0] ||
    null;

  if (!selected) return null;

  let companyName = "";
  if (selected.company_id) {
    const resp = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${selected.company_id}&select=id,name`, {
      method: "GET",
      headers: serviceHeaders(),
    });
    const rows = resp.ok ? await resp.json().catch(() => []) : [];
    companyName = Array.isArray(rows) ? rows[0]?.name || "" : "";
  }

  return {
    company_id: selected.company_id || "",
    company_name: companyName,
    role: selected.role || "",
    accepted_at: selected.accepted_at || null,
    joined_at: selected.accepted_at || selected.created_at || null,
    status: selected.accepted_at ? "active" : "invited",
  };
}

function shapeProfileResponse(user: any, profile: any, workspace: any) {
  const safeProfile = pickProfile(profile);
  return {
    ...safeProfile,
    ...splitName(safeProfile.full_name),
    email: user?.email || "",
    workspace,
  };
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);
  }

  const user = await authenticate(request);
  if (!user?.id) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  try {
    const url = new URL(request.url);
    const requestedCompanyId = url.searchParams.get("companyId");
    const profile = await fetchProfile(user.id);
    if (!profile.ok) {
      return jsonResponse({ ok: false, code: "PROFILE_FETCH_FAILED", message: "Failed to load profile." }, profile.status);
    }
    const workspace = await fetchWorkspace(user.id, requestedCompanyId);
    return jsonResponse({ ok: true, data: shapeProfileResponse(user, profile.data, workspace) }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-profile] fetch failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "PROFILE_FETCH_FAILED", message: "Failed to load profile." }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500);
  }

  const user = await authenticate(request);
  if (!user?.id) {
    return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const patch = sanitizeProfilePatch(body);
  if (!Object.keys(patch).length) {
    return jsonResponse({ ok: false, code: "NO_PROFILE_CHANGES", message: "No profile changes were provided." }, 400);
  }

  try {
    const result = await writeProfile(user.id, patch);
    if (!result.ok) {
      return jsonResponse({ ok: false, code: "PROFILE_UPDATE_FAILED", message: "Profile could not be updated." }, result.status || 500);
    }
    const workspace = await fetchWorkspace(user.id, typeof body?.companyId === "string" ? body.companyId : null);
    const notificationCompanyId = await getUserNotificationCompanyId(
      user.id,
      typeof body?.companyId === "string" ? body.companyId : null
    );
    await createNotificationsSafely([
      {
        companyId: notificationCompanyId,
        userId: user.id,
        audience: "user",
        type: "profile_updated",
        category: "system",
        severity: "info",
        title: "Profile updated",
        message: "Your profile information was updated.",
        data: { href: "/dashboard/settings" },
      },
    ], "user-profile");
    return jsonResponse({ ok: true, data: shapeProfileResponse(user, result.data, workspace) }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-profile] update failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "PROFILE_UPDATE_FAILED", message: "Profile could not be updated." }, 500);
  }
}
