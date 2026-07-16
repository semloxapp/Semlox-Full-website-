"use client";

import {
  Bell,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Shield,
  Smartphone,
  Sun,
  User,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type NotificationPreferences,
  type UserProfileData,
  userProfileQueryKeys,
  useUserProfile as useUserProfileQuery,
} from "../../../hooks/queries/useUserProfile";
import {
  userNotificationPreferencesQueryKey,
  useUserNotificationPreferences,
} from "../../../hooks/queries/useUserNotificationPreferences";

type UserSettingsViewProps = {
  companyId?: string | null;
  role?: string | null;
  initialSection?: UserSection;
  activeSection?: UserSection;
  onSectionChange?: (section: UserSection) => void;
  showNavigation?: boolean;
};

type UserSection = "profile" | "security" | "notifications" | "preferences" | "workspace";

type NotificationKey = keyof NotificationPreferences;

type ProfileForm = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  city: string;
  country: string;
  timezone: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const defaultNotifications: NotificationPreferences = {
  awb_processed: true,
  processing_failures: true,
  mentions: true,
  weekly_summary: false,
  in_app_notifications: true,
};

const notificationLabels: Record<NotificationKey, { label: string; description: string }> = {
  awb_processed: {
    label: "AWB processed",
    description: "Notify me when an uploaded AWB is processed.",
  },
  processing_failures: {
    label: "Processing failures",
    description: "Notify me when a document needs attention.",
  },
  mentions: {
    label: "Mentions",
    description: "Notify me when another user mentions me.",
  },
  weekly_summary: {
    label: "Weekly summary",
    description: "Receive a summary of workspace activity.",
  },
  in_app_notifications: {
    label: "In-app notifications",
    description: "Show notifications while using SemloX.",
  },
};

const emptyProfile: UserProfileData = {
  full_name: "",
  first_name: "",
  last_name: "",
  email: "",
  job_title: "",
  phone: "",
  avatar_url: "",
  city: "",
  country: "",
  timezone: "",
  notifications: defaultNotifications,
  workspace: null,
};

const emptyForm: ProfileForm = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  phone: "",
  city: "",
  country: "",
  timezone: "",
};

const userSections: Array<{ id: UserSection; label: string; icon: typeof User }> = [
  { id: "profile", label: "My Profile", icon: User },
  { id: "security", label: "Account & Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Monitor },
  { id: "workspace", label: "Workspace Info", icon: BriefcaseBusiness },
];

const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];
const maxAvatarBytes = 2 * 1024 * 1024;

function jsonMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

function formatRole(role?: string | null) {
  const value = String(role || "member").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Member";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString();
}

function formFromProfile(data: UserProfileData): ProfileForm {
  return {
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    jobTitle: data.job_title || "",
    phone: data.phone || "",
    city: data.city || "",
    country: data.country || "",
    timezone: data.timezone || "",
  };
}

function initialsFromProfile(data: UserProfileData, fallbackRole: string) {
  const name = data.full_name || data.email || fallbackRole;
  const parts = String(name).split(/[\s@.]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function inputClass(disabled = false) {
  return `h-10 w-full rounded-[8px] border border-white/[0.10] bg-white/[0.045] px-3 text-[13px] text-white outline-none transition placeholder:text-[#64748B] focus:border-[#2F80FF]/60 ${
    disabled ? "cursor-not-allowed opacity-60" : ""
  }`;
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.03]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h3 className="text-[14px] font-bold text-white">{title}</h3>
        <p className="mt-1 text-[11px] text-[#64748B]">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[190px_1fr] gap-5 border-b border-white/[0.06] py-4 last:border-b-0 max-lg:grid-cols-1">
      <div>
        <div className="text-[12px] font-semibold text-white">{label}</div>
        <div className="mt-1 text-[11px] leading-5 text-[#64748B]">{hint}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className="flex w-full items-center gap-4 border-b border-white/[0.06] py-3 text-left last:border-b-0 disabled:cursor-not-allowed disabled:opacity-60"
      aria-pressed={checked}
      disabled={disabled}
    >
      <span className="flex-1">
        <span className="block text-[13px] font-semibold text-white">{label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-[#64748B]">{description}</span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-[#2F80FF]" : "bg-white/[0.12]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function useUserProfile(companyId?: string | null) {
  const queryClient = useQueryClient();
  const profileQuery = useUserProfileQuery(companyId);
  const [profile, setProfile] = useState<UserProfileData>(emptyProfile);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const applyProfile = useCallback((data: UserProfileData) => {
    const nextData = { ...emptyProfile, ...data, workspace: data.workspace || null };
    setProfile(nextData);
    setForm(formFromProfile(nextData));
    setDirty(false);
  }, []);

  const loadProfile = useCallback(async () => {
    setNotice(null);
    const result = await profileQuery.refetch();
    if (result.error) {
      setNotice({ type: "error", message: result.error.message || "Failed to load profile." });
      return;
    }
    if (result.data) applyProfile(result.data);
  }, [applyProfile, profileQuery]);

  useEffect(() => {
    if (!profileQuery.data || dirty) return;
    queueMicrotask(() => applyProfile(profileQuery.data));
  }, [applyProfile, dirty, profileQuery.data]);

  useEffect(() => {
    if (profileQuery.error) {
      queueMicrotask(() =>
        setNotice({ type: "error", message: profileQuery.error?.message || "Failed to load profile." })
      );
    }
  }, [profileQuery.error]);

  const updateForm = useCallback((value: SetStateAction<ProfileForm>) => {
    setDirty(true);
    setForm(value);
  }, []);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          job_title: form.jobTitle,
          phone: form.phone,
          city: form.city,
          country: form.country,
          timezone: form.timezone,
          companyId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setNotice({ type: "error", message: jsonMessage(payload, "Profile could not be updated.") });
        return;
      }
      applyProfile(payload.data || emptyProfile);
      queryClient.setQueryData(userProfileQueryKeys.detail(companyId), payload.data || emptyProfile);
      setNotice({ type: "success", message: "Profile updated successfully." });
    } catch {
      setNotice({ type: "error", message: "Profile could not be updated." });
    } finally {
      setSaving(false);
    }
  }, [applyProfile, companyId, form, queryClient]);

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!allowedAvatarTypes.includes(file.type)) {
        setNotice({ type: "error", message: "Upload a JPG, PNG, or WebP image." });
        return;
      }
      if (file.size > maxAvatarBytes) {
        setNotice({ type: "error", message: "Profile picture must be 2 MB or smaller." });
        return;
      }

      setUploading(true);
      setNotice(null);
      try {
        const body = new FormData();
        body.append("avatar", file);
        const response = await fetch("/api/user/avatar", {
          method: "POST",
          credentials: "include",
          body,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          setNotice({ type: "error", message: jsonMessage(payload, "Profile picture could not be uploaded.") });
          return;
        }
        const avatarUrl = payload?.data?.avatar_url || "";
        setProfile((current) => {
          const next = { ...current, avatar_url: avatarUrl || current.avatar_url };
          queryClient.setQueryData(userProfileQueryKeys.detail(companyId), next);
          return next;
        });
        setNotice({ type: "success", message: "Profile picture updated." });
      } catch {
        setNotice({ type: "error", message: "Profile picture could not be uploaded." });
      } finally {
        setUploading(false);
      }
    },
    [companyId, queryClient]
  );

  const sendPasswordReset = useCallback(async () => {
    setResettingPassword(true);
    setNotice(null);
    try {
      const response = await fetch("/api/user/password-reset", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setNotice({ type: "error", message: jsonMessage(payload, "Unable to send password reset email. Please try again.") });
        return;
      }
      setNotice({ type: "success", message: "Password reset email sent. Please check your inbox." });
    } catch {
      setNotice({ type: "error", message: "Unable to send password reset email. Please try again." });
    } finally {
      setResettingPassword(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setNotice({ type: "error", message: "Unable to sign out. Please try again." });
        return;
      }
      try {
        localStorage.removeItem("semlox_access_token");
        sessionStorage.removeItem("semlox_access_token");
        localStorage.removeItem("last_company_id");
        sessionStorage.removeItem("last_company_id");
      } catch {
        // Ignore browser storage errors.
      }
      queryClient.clear();
      window.location.href = "/login";
    } catch {
      setNotice({ type: "error", message: "Unable to sign out. Please try again." });
    } finally {
      setSigningOut(false);
    }
  }, [queryClient]);

  return {
    profile,
    form,
    setForm: updateForm,
    loading: profileQuery.isPending,
    refreshing: profileQuery.isFetching,
    saving,
    uploading,
    resettingPassword,
    signingOut,
    notice,
    setNotice,
    loadProfile,
    saveProfile,
    uploadAvatar,
    sendPasswordReset,
    signOut,
  };
}

export default function UserSettingsView({
  companyId,
  role,
  initialSection = "profile",
  activeSection: controlledSection,
  onSectionChange,
  showNavigation = true,
}: UserSettingsViewProps) {
  const queryClient = useQueryClient();
  const [localSection, setLocalSection] = useState<UserSection>(initialSection);
  const activeSection = controlledSection || localSection;
  const selectSection = onSectionChange || setLocalSection;
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const [savingPreference, setSavingPreference] = useState<NotificationKey | null>(null);
  const [preferences, setPreferences] = useState({
    theme: "system",
    language: "en",
    landingPage: "dashboard",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    profile,
    form,
    setForm,
    loading,
    saving,
    uploading,
    resettingPassword,
    signingOut,
    notice,
    setNotice,
    loadProfile,
    saveProfile,
    uploadAvatar,
    sendPasswordReset,
    signOut,
  } = useUserProfile(companyId);
  const notificationsQuery = useUserNotificationPreferences();

  const displayRole = useMemo(
    () => formatRole(profile.workspace?.role || role),
    [profile.workspace?.role, role]
  );
  const workspaceName = profile.workspace?.company_name || "Current workspace";
  const initials = useMemo(() => initialsFromProfile(profile, displayRole), [displayRole, profile]);
  const formDisabled = loading || saving;

  useEffect(() => {
    if (notificationsQuery.data) {
      const nextNotifications = { ...defaultNotifications, ...notificationsQuery.data };
      queueMicrotask(() => setNotifications(nextNotifications));
      return;
    }
    const nextNotifications = profile.notifications || defaultNotifications;
    queueMicrotask(() => setNotifications(nextNotifications));
  }, [notificationsQuery.data, profile.notifications]);

  const updateNotificationPreference = useCallback(
    async (key: NotificationKey, checked: boolean) => {
      const previous = notifications;
      setNotifications((current) => ({ ...current, [key]: checked }));
      setSavingPreference(key);
      setNotice(null);

      try {
        const response = await fetch("/api/user/notifications", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifications: { [key]: checked } }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          setNotifications(previous);
          setNotice({ type: "error", message: jsonMessage(payload, "Unable to update notification preferences.") });
          return;
        }
        const nextNotifications = payload?.data?.notifications || null;
        if (nextNotifications) {
          const normalizedNotifications = { ...defaultNotifications, ...nextNotifications };
          setNotifications(normalizedNotifications);
          queryClient.setQueryData(userNotificationPreferencesQueryKey, normalizedNotifications);
          queryClient.setQueryData(userProfileQueryKeys.detail(companyId), (current: UserProfileData | undefined) =>
            current ? { ...current, notifications: normalizedNotifications } : current
          );
        }
        setNotice({ type: "success", message: jsonMessage(payload, "Notification preferences updated.") });
      } catch {
        setNotifications(previous);
        setNotice({ type: "error", message: "Unable to update notification preferences." });
      } finally {
        setSavingPreference(null);
      }
    },
    [companyId, notifications, queryClient, setNotice]
  );

  return (
    <>
      {showNavigation ? (
        <aside className="w-[210px] shrink-0 border-r border-white/[0.08] bg-[#0b101c]/65 px-3 py-5">
          <div className="px-1">
            <h1 className="text-[18px] font-extrabold tracking-[-0.04em] text-white">
              Settings
            </h1>
            <p className="mt-1 text-[9px] text-[#64748B]">Your account settings</p>
          </div>

          <div className="mt-6 space-y-1">
            {userSections.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectSection(item.id)}
                  className={`settings-user-nav-item flex h-[34px] w-full items-center gap-2 rounded-[6px] px-3 text-left text-[11px] font-semibold ${
                    isActive
                      ? "settings-user-nav-item-active border"
                      : "settings-user-nav-item-inactive"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mb-6">
          <h2 className="text-[22px] font-extrabold tracking-[-0.04em] text-white">
            User Settings
          </h2>
          <p className="mt-1 text-[12px] text-[#64748B]">
            Manage your profile, security, notifications, and preferences.
          </p>
        </div>

        {notice ? (
          <div
            className={`mb-4 rounded-[10px] border px-4 py-3 text-[12px] font-semibold ${
              notice.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/25 bg-red-400/10 text-red-300"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="settings-user-workspace-banner mb-5 flex items-center gap-4 rounded-[12px] border border-[#1B3B73] bg-gradient-to-r from-[#2F80FF]/10 to-[#00C6FF]/5 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-[#2F80FF] to-[#5865F2] text-[15px] font-bold text-white">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-white">{workspaceName}</div>
            <div className="mt-1 text-[11px] text-[#64748B]">
              Your role is {displayRole}. Company administration is managed by owners and admins.
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase text-emerald-300">
            {displayRole}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-[12px] border border-white/[0.08] bg-white/[0.03]" />
            <div className="h-72 animate-pulse rounded-[12px] border border-white/[0.08] bg-white/[0.03]" />
          </div>
        ) : (
          <div className="space-y-4">
            {activeSection === "profile" ? (
              <>
                <Card title="Profile Picture" description="Shown to your team in workspace activity.">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] bg-gradient-to-br from-[#2F80FF] to-[#5865F2] text-[22px] font-bold text-white">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadAvatar(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/[0.10] bg-white/[0.025] px-4 text-[12px] font-semibold text-[#94A3B8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      {uploading ? "Uploading" : "Upload"}
                    </button>
                    <p className="text-[10px] text-[#64748B]">JPG, PNG, or WebP. Max 2 MB.</p>
                  </div>
                </Card>

                <Card title="Personal Information" description="Your own profile details for this workspace.">
                  <Field label="Full Name" hint="Displayed across the app.">
                    <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                      <input
                        className={inputClass(formDisabled)}
                        value={form.firstName ?? ""}
                        disabled={formDisabled}
                        onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                        placeholder="First name"
                      />
                      <input
                        className={inputClass(formDisabled)}
                        value={form.lastName ?? ""}
                        disabled={formDisabled}
                        onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </Field>
                  <Field label="Email" hint="Used to sign in. Contact your admin to change it.">
                    <input className={inputClass(true)} value={profile.email || "Not available"} disabled />
                  </Field>
                  <Field label="Job Title" hint="Optional.">
                    <input
                      className={inputClass(formDisabled)}
                      value={form.jobTitle ?? ""}
                      disabled={formDisabled}
                      onChange={(event) => setForm((prev) => ({ ...prev, jobTitle: event.target.value }))}
                      placeholder="Job title"
                    />
                  </Field>
                  <Field label="Phone" hint="Optional contact number.">
                    <input
                      className={inputClass(formDisabled)}
                      value={form.phone ?? ""}
                      disabled={formDisabled}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Phone number"
                    />
                  </Field>
                  <Field label="Location" hint="Optional city and country.">
                    <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                      <input
                        className={inputClass(formDisabled)}
                        value={form.city ?? ""}
                        disabled={formDisabled}
                        onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="City"
                      />
                      <input
                        className={inputClass(formDisabled)}
                        value={form.country ?? ""}
                        disabled={formDisabled}
                        onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                        placeholder="Country"
                      />
                    </div>
                  </Field>
                  <Field label="Time Zone" hint="Used for dates and activity timestamps.">
                    <input
                      className={inputClass(formDisabled)}
                      value={form.timezone ?? ""}
                      disabled={formDisabled}
                      onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                      placeholder="Use system time zone"
                    />
                  </Field>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={formDisabled}
                      onClick={loadProfile}
                      className="h-9 rounded-[8px] border border-white/[0.10] bg-white/[0.025] px-4 text-[12px] font-semibold text-[#64748B] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={formDisabled}
                      onClick={saveProfile}
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {saving ? "Saving" : "Save Changes"}
                    </button>
                  </div>
                </Card>
              </>
            ) : activeSection === "security" ? (
              <>
                <Card title="Account Email" description="Your sign-in email is managed by Supabase Auth.">
                  <Field label="Email" hint="Read-only for this workspace.">
                    <input className={inputClass(true)} value={profile.email || "Not available"} disabled />
                  </Field>
                </Card>
                <Card title="Password Reset" description="Use the secure password recovery email flow.">
                  <div className="flex items-center gap-3 rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-4">
                    <KeyRound className="h-5 w-5 text-[#2F80FF]" />
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-white">Send password reset email</div>
                      <div className="mt-1 text-[11px] text-[#64748B]">
                        A reset link will be sent to your sign-in email.
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={resettingPassword}
                      onClick={sendPasswordReset}
                      className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/[0.10] bg-white/[0.025] px-3 text-[11px] font-semibold text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {resettingPassword ? "Sending" : "Send Email"}
                    </button>
                  </div>
                </Card>
                <Card title="Active Sessions" description="Devices currently signed in to your account.">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                      <Monitor className="h-5 w-5 text-[#64748B]" />
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold text-white">Current browser</div>
                        <div className="mt-1 text-[10px] text-[#64748B]">Active now</div>
                      </div>
                      <span className="rounded-[6px] bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
                        Current
                      </span>
                    </div>
                    <div className="rounded-[9px] border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-[#64748B]">
                      Session management is limited to the current browser.
                    </div>
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={signingOut}
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-red-400/25 bg-red-400/10 px-4 text-[12px] font-semibold text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                      {signingOut ? "Signing out" : "Sign Out"}
                    </button>
                  </div>
                </Card>
              </>
            ) : activeSection === "notifications" ? (
              <Card title="Notifications" description="Personal notification preferences.">
                <div className="mb-2 rounded-[9px] border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-[#64748B]">
                  Manage how SemloX notifies you about workspace activity.
                </div>
                {(Object.keys(notificationLabels) as NotificationKey[]).map((key) => (
                  <div key={key} className="relative">
                    <Toggle
                      checked={Boolean(notifications[key])}
                      onChange={(checked) => updateNotificationPreference(key, checked)}
                      label={notificationLabels[key].label}
                      description={notificationLabels[key].description}
                      disabled={savingPreference === key}
                    />
                    {savingPreference === key ? (
                      <Loader2 className="absolute right-12 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[#64748B]" />
                    ) : null}
                  </div>
                ))}
              </Card>
            ) : activeSection === "preferences" ? (
              <Card title="Preferences" description="Personal display and workflow defaults.">
                <div className="mb-2 rounded-[9px] border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-[#64748B]">
                  Theme, language, and landing page choices are local-only until preference storage is enabled. Time zone is saved in your profile.
                </div>
                <Field label="Theme" hint="Choose your preferred interface appearance.">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["system", Monitor, "System"],
                      ["light", Sun, "Light"],
                      ["dark", Moon, "Dark"],
                    ].map(([value, Icon, label]) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setPreferences((prev) => ({ ...prev, theme: String(value) }))}
                        className={`settings-theme-option flex h-10 items-center justify-center gap-2 rounded-[8px] border text-[12px] font-semibold ${
                          preferences.theme === value
                            ? "settings-theme-option-active"
                            : "settings-theme-option-inactive"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {String(label)}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Language" hint="Interface language.">
                  <select
                    className={inputClass()}
                    value={preferences.language}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, language: event.target.value }))}
                  >
                    <option value="en">English</option>
                  </select>
                </Field>
                <Field label="Time Zone" hint="Saved to your profile when you save changes.">
                  <input
                    className={inputClass(formDisabled)}
                    value={form.timezone ?? ""}
                    disabled={formDisabled}
                    onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                    placeholder="Use system time zone"
                  />
                </Field>
                <Field label="Default Landing Page" hint="Where SemloX opens after sign-in.">
                  <select
                    className={inputClass()}
                    value={preferences.landingPage}
                    onChange={(event) => setPreferences((prev) => ({ ...prev, landingPage: event.target.value }))}
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="awb">AWB Processing</option>
                    <option value="history">History</option>
                  </select>
                </Field>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={formDisabled}
                    onClick={saveProfile}
                    className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {saving ? "Saving" : "Save Time Zone"}
                  </button>
                </div>
              </Card>
            ) : (
              <Card title="Workspace Access" description="Read-only company membership information.">
                <Field label="Company" hint="The selected workspace for this session.">
                  <input className={inputClass(true)} value={workspaceName} disabled />
                </Field>
                <Field label="Role" hint="Your access level for the selected company.">
                  <input className={inputClass(true)} value={displayRole} disabled />
                </Field>
                <Field label="Account Status" hint="Membership status for this workspace.">
                  <input className={inputClass(true)} value={profile.workspace?.status || "Not available"} disabled />
                </Field>
                <Field label="Joined" hint="When this workspace membership became active.">
                  <input className={inputClass(true)} value={formatDate(profile.workspace?.joined_at)} disabled />
                </Field>
                <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-[#1B3B73] bg-[#0D1B35]/70 p-4">
                  <Smartphone className="mt-0.5 h-4 w-4 text-[#2F80FF]" />
                  <p className="text-[11px] leading-5 text-[#94A3B8]">
                    Team management, billing, integrations, API settings, and company profile changes are available only
                    to workspace owners and admins.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </>
  );
}
