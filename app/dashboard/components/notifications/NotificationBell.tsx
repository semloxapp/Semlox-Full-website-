"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NotificationsDropdown from "./NotificationsDropdown";
import { useNotifications } from "./useNotifications";

export default function NotificationBell({ theme }: { theme: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const notifications = useNotifications();

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await notifications.refresh();
  }

  const badge = notifications.unreadCount > 99 ? "99+" : String(notifications.unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative flex h-8 w-8 items-center justify-center rounded-md border transition ${
          open
            ? "border-[#2F80FF]/60 bg-[#2F80FF]/10"
            : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
        }`}
        aria-label={notifications.unreadCount ? `Notifications, ${notifications.unreadCount} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className={`h-4 w-4 ${open ? "text-[#2F80FF]" : "text-[#64748B]"}`} />
        {notifications.unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-[#070B17] bg-red-500 px-1 text-[8px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationsDropdown
          theme={theme}
          notifications={notifications.notifications}
          unreadCount={notifications.unreadCount}
          loading={notifications.loading}
          error={notifications.error}
          busyId={notifications.busyId}
          markingAll={notifications.markingAll}
          onRetry={() => notifications.refresh(true)}
          onMarkRead={notifications.markAsRead}
          onMarkAllRead={notifications.markAllAsRead}
          onArchive={notifications.archiveNotification}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
