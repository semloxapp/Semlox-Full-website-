"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  CircleUserRound,
  CreditCard,
  Link2,
  Loader2,
  LogOut,
  Monitor,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { useUserProfile } from "../../hooks/queries/useUserProfile";

type UserMenuProfile = {
  full_name: string;
  email: string;
  avatar_url: string;
  workspace: {
    company_name: string;
    role: string;
  } | null;
};

const emptyProfile: UserMenuProfile = {
  full_name: "",
  email: "",
  avatar_url: "",
  workspace: null,
};

const personalItems = [
  { label: "My Profile", section: "profile", icon: User },
  { label: "Account & Security", section: "security", icon: Shield },
  { label: "Notifications", section: "notifications", icon: Bell },
  { label: "Preferences", section: "preferences", icon: Monitor },
  { label: "Workspace Info", section: "workspace", icon: Building2 },
];

const adminItems = [
  { label: "Company Settings", section: "company", icon: Settings },
  { label: "Team Members", section: "team", icon: Users },
  { label: "Billing & Plan", section: "billing", icon: CreditCard },
  { label: "API & Webhooks", section: "api", icon: Link2 },
];

function profileInitials(profile: UserMenuProfile) {
  const nameParts = profile.full_name.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length) {
    return nameParts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }
  return profile.email.trim().charAt(0).toUpperCase();
}

function formatRole(value: string) {
  const role = value.trim().toLowerCase();
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
}

export default function UserAccountMenu({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState("");
  const profileQuery = useUserProfile(selectedCompanyId);
  const profile = useMemo(
    () => ({ ...emptyProfile, ...(profileQuery.data || {}), workspace: profileQuery.data?.workspace || null }),
    [profileQuery.data]
  );
  const loading = profileQuery.isPending;
  const error = actionError || profileQuery.error?.message || "";

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const initials = useMemo(() => profileInitials(profile), [profile]);
  const role = String(profile.workspace?.role || "").toLowerCase();
  const isAdmin = role === "owner" || role === "admin";
  const roleLabel = formatRole(role);
  const isDark = theme === "dark";

  function navigate(section: string) {
    setOpen(false);
    router.push(`/dashboard/settings?section=${encodeURIComponent(section)}`);
  }

  async function signOut() {
    setSigningOut(true);
    setActionError("");
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setActionError("Unable to sign out. Please try again.");
        return;
      }
      try {
        localStorage.removeItem("semlox_access_token");
        sessionStorage.removeItem("semlox_access_token");
        localStorage.removeItem("last_company_id");
        sessionStorage.removeItem("last_company_id");
      } catch {
        // Ignore browser storage errors after the server cookie is cleared.
      }
      queryClient.clear();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setActionError("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const surface = isDark
    ? "border-white/10 bg-[#0B1220] text-white"
    : "border-slate-200 bg-white text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const hover = isDark ? "hover:bg-white/[0.06]" : "hover:bg-slate-100";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-9 items-center gap-1 rounded-full pl-0.5 pr-1.5 transition focus:outline-none focus:ring-2 focus:ring-[#2F80FF]/60 ${
          open ? "bg-[#2F80FF]/10" : "hover:bg-white/[0.05]"
        }`}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#5865F2] text-[11px] font-bold text-white">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : initials ? (
            initials
          ) : (
            <CircleUserRound className="h-4 w-4" />
          )}
        </span>
        <ChevronDown className={`h-3 w-3 text-[#64748B] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className={`absolute right-0 top-[44px] z-[270] w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-[10px] border shadow-[0_22px_70px_rgba(0,0,0,0.38)] ${surface}`}
          role="menu"
          aria-label="Account menu"
        >
          <div className={`border-b px-4 py-4 ${isDark ? "border-white/10" : "border-slate-200"}`}>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 animate-pulse rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-28 animate-pulse rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                  <div className={`h-2.5 w-40 animate-pulse rounded ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-gradient-to-br from-[#2F80FF] to-[#5865F2] text-[13px] font-bold text-white">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : initials ? (
                    initials
                  ) : (
                    <CircleUserRound className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold">{profile.full_name || profile.email || "Account"}</div>
                  {profile.email ? (
                    <div className={`mt-0.5 truncate text-[10px] ${muted}`}>{profile.email}</div>
                  ) : null}
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <span className={`truncate text-[9.5px] ${muted}`}>
                      {profile.workspace?.company_name || "Current workspace"}
                    </span>
                    <span className="shrink-0 rounded-full border border-[#2F80FF]/25 bg-[#2F80FF]/10 px-2 py-0.5 text-[8px] font-bold uppercase text-[#4F8BFF]">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-1.5">
            {personalItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => navigate(item.section)}
                  className={`flex h-9 w-full items-center gap-2.5 rounded-[6px] px-3 text-left text-[11px] font-semibold ${muted} ${hover}`}
                  role="menuitem"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {isAdmin ? (
            <div className={`border-t p-1.5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() => navigate(item.section)}
                    className={`flex h-9 w-full items-center gap-2.5 rounded-[6px] px-3 text-left text-[11px] font-semibold ${muted} ${hover}`}
                    role="menuitem"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className={`border-t p-1.5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
            {error ? (
              <div className="px-3 py-2 text-[9.5px] font-semibold text-red-400">{error}</div>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex h-9 w-full items-center gap-2.5 rounded-[6px] px-3 text-left text-[11px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-60"
              role="menuitem"
            >
              {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
