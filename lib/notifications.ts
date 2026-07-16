import "server-only";

import { extractBearerTokenFromRequest, getMembershipsByUserId, getUserFromAccessToken } from "./auth";
import { supabaseServiceRoleKey, supabaseUrl } from "./supabase";

export type SafeNotification = {
  id: string;
  type: string;
  category: string;
  severity: string;
  title: string;
  message: string;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  data: { href?: string };
};

type NotificationPreferences = {
  awb_processed: boolean;
  processing_failures: boolean;
  mentions: boolean;
  weekly_summary: boolean;
  in_app_notifications: boolean;
};

type NotificationContext = {
  userId: string;
  memberships: Map<string, string>;
  preferences: NotificationPreferences;
};

type NotificationAudience = "user" | "company_members" | "company_admins";
type NotificationCategory =
  | "system"
  | "security"
  | "team"
  | "awb"
  | "document"
  | "mention"
  | "workspace"
  | "billing";
type NotificationSeverity = "info" | "success" | "warning" | "error" | "critical";

export type CreateNotificationInput = {
  companyId?: string | null;
  userId?: string | null;
  audience: NotificationAudience;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  data?: { href?: string } | null;
  expiresAt?: string | null;
};

export type NotificationRow = {
  id?: unknown;
  company_id?: unknown;
  user_id?: unknown;
  recipient_id?: unknown;
  audience?: unknown;
  type?: unknown;
  notification_type?: unknown;
  category?: unknown;
  severity?: unknown;
  title?: unknown;
  message?: unknown;
  data?: unknown;
  read_at?: unknown;
  is_read?: unknown;
  archived_at?: unknown;
  expires_at?: unknown;
  created_at?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const defaultPreferences: NotificationPreferences = {
  awb_processed: true,
  processing_failures: true,
  mentions: true,
  weekly_summary: false,
  in_app_notifications: true,
};

const notificationAudiences = new Set<NotificationAudience>(["user", "company_members", "company_admins"]);
const notificationCategories = new Set<NotificationCategory>([
  "system",
  "security",
  "team",
  "awb",
  "document",
  "mention",
  "workspace",
  "billing",
]);
const notificationSeverities = new Set<NotificationSeverity>(["info", "success", "warning", "error", "critical"]);
const notificationTypePattern = /^[a-z0-9_]{1,80}$/;

export function jsonResponse(body: unknown, status = 200) {
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

function normalizePreferences(value: unknown): NotificationPreferences {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = { ...defaultPreferences };
  for (const key of Object.keys(defaultPreferences) as Array<keyof NotificationPreferences>) {
    const candidate = (source as Record<string, unknown>)[key];
    if (typeof candidate === "boolean") result[key] = candidate;
  }
  return result;
}

async function getPreferences(userId: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=metadata`, {
    headers: serviceHeaders(),
  });
  if (!response.ok) return defaultPreferences;
  const rows = await response.json().catch(() => []);
  const metadata = Array.isArray(rows) && rows[0] && typeof rows[0] === "object"
    ? (rows[0] as Record<string, unknown>).metadata
    : null;
  const notifications = metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>).notifications
    : null;
  return normalizePreferences(notifications);
}

export async function getNotificationContext(request: Request): Promise<NotificationContext | null> {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  const token = await extractBearerTokenFromRequest(request);
  if (!token) return null;
  const user = await getUserFromAccessToken(token);
  if (!user?.id) return null;

  const [membershipRows, preferences] = await Promise.all([
    getMembershipsByUserId(user.id),
    getPreferences(user.id),
  ]);
  const memberships = new Map<string, string>();
  for (const membership of membershipRows) {
    if (membership && typeof membership === "object") {
      const row = membership as Record<string, unknown>;
      if (!row.company_id || !row.accepted_at) continue;
      memberships.set(String(row.company_id), String(row.role || "").toLowerCase());
    }
  }
  return { userId: user.id, memberships, preferences };
}

export function notificationAudience(row: NotificationRow) {
  const audience = String(row.audience || "").toLowerCase();
  if (audience === "user" || audience === "company_members" || audience === "company_admins") {
    return audience;
  }
  return row.user_id || row.recipient_id ? "user" : "company_members";
}

function normalizedType(row: NotificationRow) {
  return String(row.type || row.notification_type || "system").toLowerCase();
}

function normalizedCategory(row: NotificationRow) {
  return String(row.category || "system").toLowerCase();
}

function normalizedSeverity(row: NotificationRow) {
  return String(row.severity || "info").toLowerCase();
}

function isExpired(row: NotificationRow) {
  if (typeof row.expires_at !== "string" && typeof row.expires_at !== "number") return false;
  const value = new Date(row.expires_at).getTime();
  return Number.isFinite(value) && value <= Date.now();
}

function preferenceAllows(row: NotificationRow, preferences: NotificationPreferences) {
  const type = normalizedType(row);
  const category = normalizedCategory(row);
  const severity = normalizedSeverity(row);
  if (severity === "critical" || category === "security" || type === "security") return true;
  if (!preferences.in_app_notifications) return false;
  if (type === "awb_processed" && !preferences.awb_processed) return false;
  if ((type === "processing_failed" || type === "processing_failure") && !preferences.processing_failures) return false;
  if (type === "mention" && !preferences.mentions) return false;
  if (type === "weekly_summary" && !preferences.weekly_summary) return false;
  return true;
}

export function notificationIsVisible(row: NotificationRow, context: NotificationContext) {
  if (!row || row.archived_at || isExpired(row)) return false;
  const audience = notificationAudience(row);
  const companyId = row.company_id ? String(row.company_id) : "";
  const recipientId = String(row.user_id || row.recipient_id || "");

  if (audience === "user") {
    if (recipientId !== context.userId) return false;
  } else if (audience === "company_members") {
    if (!companyId || !context.memberships.has(companyId)) return false;
  } else if (audience === "company_admins") {
    const role = context.memberships.get(companyId);
    if (role !== "owner" && role !== "admin") return false;
  } else {
    return false;
  }

  return preferenceAllows(row, context.preferences);
}

function safeData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = (value as Record<string, unknown>).href;
  const href = typeof candidate === "string" && candidate.startsWith("/dashboard") ? candidate : undefined;
  return href ? { href } : {};
}

export function toSafeNotification(row: NotificationRow): SafeNotification {
  const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
  const readAt = typeof row.read_at === "string" ? row.read_at : row.is_read ? createdAt : null;
  const archivedAt = typeof row.archived_at === "string" ? row.archived_at : null;
  return {
    id: String(row.id),
    type: normalizedType(row),
    category: normalizedCategory(row),
    severity: normalizedSeverity(row),
    title: String(row.title || "Notification").slice(0, 180),
    message: String(row.message || "").slice(0, 500),
    read_at: readAt,
    archived_at: archivedAt,
    created_at: createdAt,
    data: safeData(row.data),
  };
}

export async function getVisibleNotificationRows(context: NotificationContext, limit = 50) {
  const companyIds = [...context.memberships.keys()];
  const filters = [`user_id.eq.${context.userId}`, `recipient_id.eq.${context.userId}`];
  if (companyIds.length) filters.push(`company_id.in.(${companyIds.join(",")})`);

  const url =
    `${supabaseUrl}/rest/v1/notifications?select=*` +
    `&or=(${filters.join(",")})` +
    `&order=created_at.desc&limit=${Math.max(limit * 4, 100)}`;
  const response = await fetch(url, { headers: serviceHeaders() });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const rows = await response.json().catch(() => []);
  const notificationRows = Array.isArray(rows) ? rows : [];
  const sharedIds = notificationRows
    .filter((row) => notificationAudience(row) !== "user")
    .map((row) => String(row.id))
    .filter(isUuid);
  const receipts = new Map<string, { read_at: string | null; archived_at: string | null }>();

  if (sharedIds.length) {
    const receiptResponse = await fetch(
      `${supabaseUrl}/rest/v1/notification_receipts?user_id=eq.${context.userId}` +
      `&notification_id=in.(${sharedIds.join(",")})&select=notification_id,read_at,archived_at`,
      { headers: serviceHeaders() }
    );
    if (!receiptResponse.ok) throw new Error("Failed to fetch notification receipts");
    const receiptRows = await receiptResponse.json().catch(() => []);
    for (const receipt of Array.isArray(receiptRows) ? receiptRows : []) {
      receipts.set(String(receipt.notification_id), {
        read_at: typeof receipt.read_at === "string" ? receipt.read_at : null,
        archived_at: typeof receipt.archived_at === "string" ? receipt.archived_at : null,
      });
    }
  }

  return notificationRows
    .map((row) => {
      if (notificationAudience(row) === "user") return row;
      const receipt = receipts.get(String(row.id));
      return {
        ...row,
        read_at: receipt?.read_at || null,
        is_read: Boolean(receipt?.read_at),
        archived_at: receipt?.archived_at || null,
      };
    })
    .filter((row) => notificationIsVisible(row, context))
    .slice(0, limit);
}

export function unreadCount(rows: NotificationRow[]) {
  return rows.reduce((count, row) => count + (row.read_at || row.is_read ? 0 : 1), 0);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function updateNotificationRows(ids: string[], patch: Record<string, unknown>) {
  if (!ids.length) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/notifications?id=in.(${ids.join(",")})`, {
    method: "PATCH",
    headers: serviceHeaders(),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Failed to update notifications");
}

async function upsertNotificationReceipts(
  notificationIds: string[],
  userId: string,
  patch: { read_at?: string; archived_at?: string }
) {
  if (!notificationIds.length) return;
  const rows = notificationIds.map((notificationId) => ({
    notification_id: notificationId,
    user_id: userId,
    ...patch,
  }));
  const response = await fetch(
    `${supabaseUrl}/rest/v1/notification_receipts?on_conflict=notification_id,user_id`,
    {
      method: "POST",
      headers: {
        ...serviceHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );
  if (!response.ok) throw new Error("Failed to update notification receipts");
}

export async function markNotificationRead(row: NotificationRow, userId: string) {
  const notificationId = String(row.id || "");
  if (!isUuid(notificationId)) throw new Error("Invalid notification id");
  const readAt = new Date().toISOString();
  if (notificationAudience(row) === "user") {
    await updateNotificationRows([notificationId], { read_at: readAt, is_read: true });
  } else {
    await upsertNotificationReceipts([notificationId], userId, { read_at: readAt });
  }
}

export async function markNotificationsRead(rows: NotificationRow[], userId: string) {
  const directIds = rows
    .filter((row) => notificationAudience(row) === "user" && !row.read_at && !row.is_read)
    .map((row) => String(row.id))
    .filter(isUuid);
  const sharedIds = rows
    .filter((row) => notificationAudience(row) !== "user" && !row.read_at)
    .map((row) => String(row.id))
    .filter(isUuid);
  const readAt = new Date().toISOString();
  await Promise.all([
    updateNotificationRows(directIds, { read_at: readAt, is_read: true }),
    upsertNotificationReceipts(sharedIds, userId, { read_at: readAt }),
  ]);
}

export async function archiveNotification(row: NotificationRow, userId: string) {
  const notificationId = String(row.id || "");
  if (!isUuid(notificationId)) throw new Error("Invalid notification id");
  const archivedAt = new Date().toISOString();
  if (notificationAudience(row) === "user") {
    await updateNotificationRows([notificationId], { archived_at: archivedAt });
  } else {
    await upsertNotificationReceipts([notificationId], userId, { archived_at: archivedAt });
  }
}

function sanitizeCreateData(value: CreateNotificationInput["data"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const href = typeof value.href === "string" && value.href.startsWith("/dashboard")
    ? value.href.slice(0, 300)
    : undefined;
  return href ? { href } : {};
}

export async function createNotification(input: CreateNotificationInput) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false as const, code: "NOTIFICATION_SERVICE_UNAVAILABLE" };
  }
  if (!notificationAudiences.has(input.audience)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_AUDIENCE" };
  }
  if (!notificationCategories.has(input.category)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_CATEGORY" };
  }
  if (!notificationSeverities.has(input.severity)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_SEVERITY" };
  }
  if (!notificationTypePattern.test(input.type)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_TYPE" };
  }
  if (input.audience === "user" && !input.userId) {
    return { ok: false as const, code: "MISSING_NOTIFICATION_USER" };
  }
  if (input.audience !== "user" && !input.companyId) {
    return { ok: false as const, code: "MISSING_NOTIFICATION_COMPANY" };
  }
  if (input.userId && !isUuid(input.userId)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_USER" };
  }
  if (input.companyId && !isUuid(input.companyId)) {
    return { ok: false as const, code: "INVALID_NOTIFICATION_COMPANY" };
  }

  const expiresAt = input.expiresAt && Number.isFinite(new Date(input.expiresAt).getTime())
    ? new Date(input.expiresAt).toISOString()
    : null;
  const payload = {
    company_id: input.companyId || null,
    user_id: input.audience === "user" ? input.userId || null : null,
    recipient_id: input.audience === "user" ? input.userId || null : null,
    audience: input.audience,
    type: input.type,
    notification_type: input.type,
    category: input.category,
    severity: input.severity,
    title: input.title.trim().slice(0, 180),
    message: input.message.trim().slice(0, 500),
    data: sanitizeCreateData(input.data),
    is_read: false,
    read_at: null,
    archived_at: null,
    expires_at: expiresAt,
  };

  if (!payload.title) return { ok: false as const, code: "MISSING_NOTIFICATION_TITLE" };

  const response = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { ok: false as const, code: "NOTIFICATION_INSERT_FAILED" };
  return { ok: true as const };
}

export async function createNotificationsSafely(inputs: CreateNotificationInput[], source: string) {
  try {
    const results = await Promise.all(inputs.map((input) => createNotification(input)));
    const failed = results.filter((result) => !result.ok);
    if (failed.length && process.env.NODE_ENV !== "production") {
      console.log(`[${source}] notification creation failed`, {
        count: failed.length,
        codes: failed.map((result) => result.code),
      });
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[${source}] notification creation failed`, {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export async function getCompanyName(companyId: string) {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isUuid(companyId)) return "";
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companyId}&select=name`, {
      headers: serviceHeaders(),
    });
    if (!response.ok) return "";
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) ? String(rows[0]?.name || "") : "";
  } catch {
    return "";
  }
}

export async function getUserLabel(userId: string) {
  if (!supabaseUrl || !supabaseServiceRoleKey || !isUuid(userId)) return "A team member";
  try {
    const [profileResponse, authResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name`, { headers: serviceHeaders() }),
      fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=email`, { headers: serviceHeaders() }),
    ]);
    const profiles = profileResponse.ok ? await profileResponse.json().catch(() => []) : [];
    const users = authResponse.ok ? await authResponse.json().catch(() => []) : [];
    return String(
      (Array.isArray(profiles) ? profiles[0]?.full_name : "") ||
      (Array.isArray(users) ? users[0]?.email : "") ||
      "A team member"
    ).slice(0, 160);
  } catch {
    return "A team member";
  }
}

export async function getUserNotificationCompanyId(userId: string, preferredCompanyId?: string | null) {
  try {
    const memberships = await getMembershipsByUserId(userId);
    if (preferredCompanyId && memberships.some((row) => String(row?.company_id || "") === preferredCompanyId)) {
      return preferredCompanyId;
    }
    const accepted = memberships.find((row) => row?.accepted_at);
    return accepted?.company_id ? String(accepted.company_id) : null;
  } catch {
    return null;
  }
}
