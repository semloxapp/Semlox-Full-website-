"use client";

import {
  AtSign,
  Bell,
  CheckCheck,
  CircleAlert,
  CreditCard,
  FileCheck2,
  Image,
  Info,
  Loader2,
  Mail,
  Megaphone,
  RefreshCw,
  Shield,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "./useNotifications";

type NotificationsDropdownProps = {
  theme: "light" | "dark";
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string;
  busyId: string | null;
  markingAll: boolean;
  onRetry: () => void;
  onMarkRead: (id: string) => Promise<boolean>;
  onMarkAllRead: () => void;
  onArchive: (id: string) => void;
  onClose: () => void;
};

function timeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function notificationIcon(item: NotificationItem) {
  if (item.category === "security" || item.type === "security" || item.type === "password_reset_requested") return Shield;
  if (item.category === "billing") return CreditCard;
  if (item.type === "awb_processed") return FileCheck2;
  if (item.type === "processing_failed" || item.severity === "error" || item.severity === "critical") return CircleAlert;
  if (item.type === "mention") return AtSign;
  if (item.type === "invite_accepted") return UserCheck;
  if (item.type === "member_added" || item.type === "member_invited" || item.type === "member_readded") return UserPlus;
  if (item.type === "invite_resent" || item.type === "workspace_invite_resent") return RefreshCw;
  if (item.type === "workspace_invite") return Mail;
  if (item.type === "workspace_announcement") return Megaphone;
  if (item.type === "member_removed" || item.type === "workspace_access_removed") return UserMinus;
  if (item.type === "role_changed" || item.type === "profile_updated") return UserCheck;
  if (item.type === "avatar_updated") return Image;
  if (item.type === "welcome" || item.type === "workspace_access_added") return Sparkles;
  return Info;
}

function severityClasses(severity: string) {
  if (severity === "critical" || severity === "error") return "border-red-400/25 bg-red-400/10 text-red-400";
  if (severity === "warning") return "border-amber-400/25 bg-amber-400/10 text-amber-400";
  if (severity === "success") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-400";
  return "border-blue-400/20 bg-blue-400/10 text-blue-400";
}

export default function NotificationsDropdown(props: NotificationsDropdownProps) {
  const router = useRouter();
  const isDark = props.theme === "dark";
  const surface = isDark ? "border-white/10 bg-[#0B1220] text-white" : "border-slate-200 bg-white text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";

  async function openNotification(item: NotificationItem) {
    const marked = await props.onMarkRead(item.id);
    const href = item.data?.href;
    if (marked && typeof href === "string" && href.startsWith("/dashboard")) {
      props.onClose();
      router.push(href);
    }
  }

  return (
    <section
      className={`absolute right-0 top-[42px] z-[260] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[10px] border shadow-[0_22px_70px_rgba(0,0,0,0.35)] ${surface}`}
      role="dialog"
      aria-label="Notifications"
    >
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? "border-white/10" : "border-slate-200"}`}>
        <div>
          <h3 className="text-[13px] font-bold">Notifications</h3>
          <p className={`mt-0.5 text-[10px] ${muted}`}>
            {props.unreadCount ? `${props.unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {props.unreadCount > 0 ? (
            <button
              type="button"
              disabled={props.markingAll}
              onClick={props.onMarkAllRead}
              className={`inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[10px] font-semibold ${muted} hover:bg-blue-500/10 hover:text-blue-500 disabled:opacity-50`}
            >
              {props.markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
              Mark all read
            </button>
          ) : null}
          <button
            type="button"
            onClick={props.onClose}
            className={`flex h-7 w-7 items-center justify-center rounded-[6px] ${muted} hover:bg-black/5 dark:hover:bg-white/5`}
            aria-label="Close notifications"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(520px,calc(100vh-100px))] overflow-y-auto">
        {props.loading && !props.notifications.length ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`h-16 animate-pulse rounded-[8px] ${isDark ? "bg-white/5" : "bg-slate-100"}`} />
            ))}
          </div>
        ) : props.error && !props.notifications.length ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <CircleAlert className="h-7 w-7 text-red-400" />
            <p className="mt-3 text-[12px] font-semibold">{props.error}</p>
            <button
              type="button"
              onClick={props.onRetry}
              className="mt-3 h-8 rounded-[7px] bg-[#2F80FF] px-4 text-[11px] font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : !props.notifications.length ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
              <Bell className={`h-5 w-5 ${muted}`} />
            </div>
            <p className="mt-3 text-[12px] font-bold">No notifications yet.</p>
            <p className={`mt-1 text-[10px] ${muted}`}>New workspace activity will appear here.</p>
          </div>
        ) : (
          <div>
            {props.error ? (
              <div className="border-b border-red-400/20 bg-red-400/10 px-4 py-2 text-[10px] font-semibold text-red-400">
                {props.error}
              </div>
            ) : null}
            {props.notifications.map((item) => {
              const Icon = notificationIcon(item);
              const unread = !item.read_at;
              const busy = props.busyId === item.id;
              return (
                <article
                  key={item.id}
                  className={`group relative flex gap-3 border-b px-4 py-3 last:border-b-0 ${
                    isDark ? "border-white/[0.07]" : "border-slate-100"
                  } ${unread ? (isDark ? "bg-blue-500/[0.07]" : "bg-blue-50/70") : ""}`}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openNotification(item)}
                    className="flex min-w-0 flex-1 gap-3 text-left disabled:opacity-60"
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border ${severityClasses(item.severity)}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold">{item.title}</span>
                        {unread ? <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2F80FF]" /> : null}
                      </span>
                      {item.message ? (
                        <span className={`mt-1 block line-clamp-2 text-[10.5px] leading-[1.45] ${muted}`}>{item.message}</span>
                      ) : null}
                      <span className={`mt-1.5 block text-[9px] ${muted}`}>{timeAgo(item.created_at)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => props.onArchive(item.id)}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${muted} hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30`}
                    aria-label="Dismiss notification"
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
