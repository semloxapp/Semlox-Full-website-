import {
  getNotificationContext,
  getVisibleNotificationRows,
  jsonResponse,
  markNotificationsRead,
} from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const context = await getNotificationContext(request);
    if (!context) {
      return jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }, 401);
    }
    const rows = await getVisibleNotificationRows(context, 200);
    await markNotificationsRead(rows, context.userId);
    return jsonResponse({ ok: true, data: { unreadCount: 0 } });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[notifications] mark all failed", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    return jsonResponse({ ok: false, code: "NOTIFICATION_UPDATE_FAILED", message: "Unable to mark notifications as read." }, 500);
  }
}
