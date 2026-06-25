import {
  archiveNotification,
  getNotificationContext,
  getVisibleNotificationRows,
  isUuid,
  jsonResponse,
} from "@/lib/notifications";

export async function POST(request: Request) {
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
    await archiveNotification(target, context.userId);
    return jsonResponse({ ok: true });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[notifications] archive failed", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    return jsonResponse({ ok: false, code: "NOTIFICATION_UPDATE_FAILED", message: "Unable to dismiss notification." }, 500);
  }
}
