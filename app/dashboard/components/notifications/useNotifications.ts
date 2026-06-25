"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationItem = {
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

const STALE_AFTER_MS = 30_000;
const POLL_INTERVAL_MS = 60_000;

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const lastFetchedAt = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetchedAt.current < STALE_AFTER_MS) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setError(responseMessage(payload, "Unable to load notifications."));
        return;
      }
      setNotifications(Array.isArray(payload?.data?.notifications) ? payload.data.notifications : []);
      setUnreadCount(Number(payload?.data?.unreadCount) || 0);
      lastFetchedAt.current = Date.now();
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => refresh(true));
    const timer = window.setInterval(() => refresh(true), POLL_INTERVAL_MS);
    const handleNotificationsChanged = () => refresh(true);
    window.addEventListener("semlox:notifications-changed", handleNotificationsChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("semlox:notifications-changed", handleNotificationsChanged);
    };
  }, [refresh]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.read_at) return true;
    setBusyId(notificationId);
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setError(responseMessage(payload, "Unable to update notification."));
        return false;
      }
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
      setUnreadCount(Number(payload?.data?.unreadCount) || 0);
      return true;
    } catch {
      setError("Unable to update notification.");
      return false;
    } finally {
      setBusyId(null);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    setError("");
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setError(responseMessage(payload, "Unable to mark notifications as read."));
        return;
      }
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })));
      setUnreadCount(0);
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const archiveNotification = useCallback(async (notificationId: string) => {
    const current = notifications.find((item) => item.id === notificationId);
    setBusyId(notificationId);
    setError("");
    try {
      const response = await fetch("/api/notifications/archive", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setError(responseMessage(payload, "Unable to dismiss notification."));
        return;
      }
      setNotifications((items) => items.filter((item) => item.id !== notificationId));
      if (current && !current.read_at) setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      setError("Unable to dismiss notification.");
    } finally {
      setBusyId(null);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    busyId,
    markingAll,
    refresh,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  };
}
