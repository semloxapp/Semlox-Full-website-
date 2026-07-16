import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";

type NotificationPreferences = {
  awb_processed: boolean;
  processing_failures: boolean;
  mentions: boolean;
  weekly_summary: boolean;
  in_app_notifications: boolean;
};

const defaultNotifications: NotificationPreferences = {
  awb_processed: true,
  processing_failures: true,
  mentions: true,
  weekly_summary: false,
  in_app_notifications: true,
};

const allowedNotificationKeys = Object.keys(defaultNotifications) as Array<keyof NotificationPreferences>;

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

function normalizeMetadata(value: any) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeNotifications(value: any): NotificationPreferences {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const next = { ...defaultNotifications };
  for (const key of allowedNotificationKeys) {
    if (typeof source[key] === "boolean") next[key] = source[key];
  }
  return next;
}

function pickAllowedNotifications(input: any) {
  const source = input?.notifications && typeof input.notifications === "object" ? input.notifications : input;
  const patch: Partial<NotificationPreferences> = {};

  for (const key of allowedNotificationKeys) {
    if (!(key in (source || {}))) continue;
    if (typeof source[key] !== "boolean") {
      return { ok: false as const, code: "INVALID_NOTIFICATION_VALUE", message: "Notification preferences must be true or false." };
    }
    patch[key] = source[key];
  }

  if (!Object.keys(patch).length) {
    return { ok: false as const, code: "NO_NOTIFICATION_CHANGES", message: "No notification preferences were provided." };
  }

  return { ok: true as const, patch };
}

function isMissingMetadataColumn(data: any) {
  const text = `${data?.message || ""} ${data?.details || ""} ${data?.hint || ""}`.toLowerCase();
  return text.includes("metadata") && text.includes("column");
}

async function fetchProfile(userId: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,metadata`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    return { ok: false, status: resp.status, data };
  }
  return {
    ok: true,
    status: resp.status,
    data: Array.isArray(data) ? data[0] || null : null,
  };
}

async function writeMetadata(userId: string, metadata: Record<string, any>, hasProfile: boolean) {
  const url = hasProfile
    ? `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,metadata`
    : `${supabaseUrl}/rest/v1/profiles?select=id,metadata`;
  const resp = await fetch(url, {
    method: hasProfile ? "PATCH" : "POST",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(hasProfile ? { metadata } : { id: userId, metadata }),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
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
    const profile = await fetchProfile(user.id);
    if (!profile.ok) {
      if (isMissingMetadataColumn(profile.data)) {
        return jsonResponse({ ok: false, code: "PROFILE_METADATA_NOT_CONFIGURED", message: "Notification preference storage is not configured." }, 500);
      }
      return jsonResponse({ ok: false, code: "NOTIFICATIONS_FETCH_FAILED", message: "Unable to load notification preferences." }, profile.status || 500);
    }

    const metadata = normalizeMetadata(profile.data?.metadata);
    return jsonResponse({ ok: true, data: { notifications: normalizeNotifications(metadata.notifications) } }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-notifications] fetch failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "NOTIFICATIONS_FETCH_FAILED", message: "Unable to load notification preferences." }, 500);
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
  const parsed = pickAllowedNotifications(body);
  if (!parsed.ok) {
    return jsonResponse({ ok: false, code: parsed.code, message: parsed.message }, 400);
  }

  try {
    const profile = await fetchProfile(user.id);
    if (!profile.ok) {
      if (isMissingMetadataColumn(profile.data)) {
        return jsonResponse({ ok: false, code: "PROFILE_METADATA_NOT_CONFIGURED", message: "Notification preference storage is not configured." }, 500);
      }
      return jsonResponse({ ok: false, code: "NOTIFICATIONS_UPDATE_FAILED", message: "Unable to update notification preferences." }, profile.status || 500);
    }

    const metadata = normalizeMetadata(profile.data?.metadata);
    const notifications = {
      ...normalizeNotifications(metadata.notifications),
      ...parsed.patch,
    };
    const result = await writeMetadata(user.id, { ...metadata, notifications }, Boolean(profile.data));

    if (!result.ok) {
      if (isMissingMetadataColumn(result.data)) {
        return jsonResponse({ ok: false, code: "PROFILE_METADATA_NOT_CONFIGURED", message: "Notification preference storage is not configured." }, 500);
      }
      return jsonResponse({ ok: false, code: "NOTIFICATIONS_UPDATE_FAILED", message: "Unable to update notification preferences." }, result.status || 500);
    }

    return jsonResponse({ ok: true, message: "Notification preferences updated.", data: { notifications } }, 200);
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") console.log("[user-notifications] update failed", { message: err?.message || "Unknown error" });
    return jsonResponse({ ok: false, code: "NOTIFICATIONS_UPDATE_FAILED", message: "Unable to update notification preferences." }, 500);
  }
}
