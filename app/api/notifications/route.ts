import {
  getNotificationContext,
  getVisibleNotificationRows,
  isUuid,
  jsonResponse,
  markNotificationRead,
  toSafeNotification,
  unreadCount,
} from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const context = await getNotificationContext(request);
    if (!context) {
      return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
    }
    const rows = await getVisibleNotificationRows(context, 50);
    return jsonResponse({
      ok: true,
      data: {
        unreadCount: unreadCount(rows),
        notifications: rows.map(toSafeNotification),
      },
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[notifications] fetch failed", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    return jsonResponse({ ok: false, code: "NOTIFICATIONS_FETCH_FAILED", message: "Unable to load notifications." }, 500);
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body?.notificationId)) {
    return jsonResponse({ ok: false, code: "INVALID_NOTIFICATION_ID", message: "Invalid notification." }, 400);
  }

  try {
    const context = await getNotificationContext(request);
    if (!context) {
      return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
    }
    const rows = await getVisibleNotificationRows(context, 200);
    const target = rows.find((row) => row.id === body.notificationId);
    if (!target) {
      return jsonResponse({ ok: false, code: "NOTIFICATION_NOT_FOUND", message: "Notification not found." }, 404);
    }
    await markNotificationRead(target, context.userId);
    const remaining = rows.map((row) =>
      row.id === body.notificationId ? { ...row, read_at: new Date().toISOString(), is_read: true } : row
    );
    return jsonResponse({ ok: true, data: { unreadCount: unreadCount(remaining) } });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[notifications] mark read failed", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    return jsonResponse({ ok: false, code: "NOTIFICATION_UPDATE_FAILED", message: "Unable to update notification." }, 500);
  }
}
