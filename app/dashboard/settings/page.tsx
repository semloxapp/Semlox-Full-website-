"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "../../context/CompanyContext";
import { type CompanyMember, useCompanyMembersQuery } from "../../hooks/queries/useCompanyMembers";
import { membershipErrorStatus, useMemberships } from "../../hooks/queries/useMemberships";
import type { Membership } from "../../types/membership";
import UserSettingsView from "./components/UserSettingsView";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  Check,
  Copy,
  CreditCard,
  FileText,
  Filter,
  Globe2,
  Home,
  Link2,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Plus,
  RotateCw,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

function AppHeader() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[200] flex h-[42px] items-center justify-between border-b border-white/[0.08] bg-[#070B17] px-5 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2F80FF]">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          <div className="leading-none">
            <h1 className="text-[12px] font-bold">SemloX</h1>
            <p className="mt-1 text-[8px] tracking-[0.1em] text-[#64748B]">
              AI DOCUMENT ENGINE
            </p>
          </div>
        </div>

        <div className="ml-12 h-10 w-px bg-white/[0.09]" />

        <div className="ml-3 leading-none">
          <h2 className="mb-0.5 text-[11px] font-semibold text-white">Settings</h2>
          <p className="text-[8px] text-[#64748B]">
            DB Schenker Logistics
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-3 py-[5px] text-[10px] font-semibold text-white shadow-md hover:opacity-90">
          <Upload className="h-3 w-3" />
          Upload AWB
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Filter className="h-3.5 w-3.5 text-[#64748B]" />
        </button>
        <button className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Bell className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold">
          AK
        </div>
      </div>
    </div>
  );
}

function MainSidebar({ settingsActive = true }: { settingsActive?: boolean }) {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#070B17] px-2 py-3 text-white">
      <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
        Menu
      </div>

      <nav className="space-y-1">
        <Link href="/dashboard" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Home className="h-3.5 w-3.5" />
          Overview
        </Link>

        <Link href="/dashboard/awb" className="flex h-[30px] items-center justify-between rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            AWB Processing
          </span>
          <span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[#123D8A] text-[8px] font-bold text-[#4F8BFF]">
            3
          </span>
        </Link>

        <Link href="/dashboard/history" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Activity className="h-3.5 w-3.5" />
          History
        </Link>

        <Link
          href="/dashboard/settings"
          className={`flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] ${
            settingsActive
              ? "border border-[#1B3B73] bg-[#0D1B35] font-bold text-white shadow-[inset_3px_0_0_#2F80FF]"
              : "font-medium text-[#6F86AA] hover:bg-white/[0.03]"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </nav>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <div className="rounded-[7px] border border-[#17325F] bg-[#0A1530] p-3">
          <h3 className="text-[10px] font-bold text-white">Enterprise Plan</h3>
          <p className="mt-1 text-[8px] text-[#7D8EA8]">10,000 AWBs/month</p>
          <div className="mt-2 h-[3px] w-full rounded-full bg-[#132746]">
            <div className="h-full w-[48%] rounded-full bg-[#00D9FF]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[8px]">
            <span className="text-[#2F80FF]">4,823</span>
            <span className="text-[#64748B]">of 10,000 used</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
          Support
        </div>
        <a className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <FileText className="h-3.5 w-3.5" />
          Documentation
        </a>
      </div>

      <Link href="/logout" className="mt-auto mb-3 flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </Link>

      <div className="flex items-center gap-2 px-3 pb-1">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[9px] font-bold text-white">
          AK
        </div>
        <div className="leading-none">
          <h4 className="text-[10px] font-bold text-white">Anna Keller</h4>
          <p className="mt-1 text-[8px] text-[#64748B]">DB Schenker Admin</p>
        </div>
      </div>
    </aside>
  );
}

void AppHeader;
void MainSidebar;

type SettingsSection =
  | "company"
  | "team"
  | "api"
  | "integrations"
  | "notifications"
  | "security"
  | "billing"
  | "profile"
  | "preferences"
  | "workspace";

type UserSettingsSection = "profile" | "security" | "notifications" | "preferences" | "workspace";

type AuthMembership = Membership;

const settingsGroups: Array<{
  label: string;
  items: Array<{
    id: SettingsSection | "api" | "integrations" | "notifications" | "security" | "billing" | "profile";
    label: string;
    icon: typeof Building2;
  }>;
}> = [
  {
    label: "Workspace",
    items: [
      { id: "company", label: "Company Profile", icon: Building2 },
      { id: "team", label: "Team Members", icon: Users },
      { id: "api", label: "API & Webhooks", icon: Link2 },
      { id: "integrations", label: "Integrations", icon: Globe2 },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "security", label: "Security", icon: Shield },
      { id: "billing", label: "Billing & Plan", icon: CreditCard },
    ],
  },
  {
    label: "Personal",
    items: [
      { id: "profile", label: "My Profile", icon: User },
      { id: "preferences", label: "Preferences", icon: Settings },
      { id: "workspace", label: "Workspace Info", icon: Building2 },
    ],
  },
];

function SettingsSideNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <aside className="w-[210px] shrink-0 border-r border-white/[0.08] bg-[#0b101c]/65 px-3 py-5">
      <div className="px-1">
        <h1 className="text-[18px] font-extrabold tracking-[-0.04em] text-white">
          Settings
        </h1>
        <p className="mt-1 text-[9px] text-[#64748B]">Workspace administration</p>
      </div>

      <div className="mt-6 space-y-5">
        {settingsGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#334155]">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
      if (
                        item.id === "company" ||
                        item.id === "team" ||
                        item.id === "api" ||
                        item.id === "integrations" ||
                        item.id === "notifications" ||
                        item.id === "security" ||
                        item.id === "billing" ||
                        item.id === "profile" ||
                        item.id === "preferences" ||
                        item.id === "workspace"
                      ) {
                        onSectionChange(item.id);
                      }
                    }}
                    className={`settings-admin-nav-item flex h-[34px] w-full items-center gap-2 rounded-[6px] px-3 text-left text-[11px] font-semibold ${
                      isActive
                        ? "settings-admin-nav-item-active border"
                        : "settings-admin-nav-item-inactive"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Legacy helpers retained for Settings sections outside the Company Profile migration scope.
function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[190px_1fr] gap-6 border-t border-white/[0.08] py-3 first:border-t-0">
      <div>
        <div className="text-[11px] font-extrabold text-white">{label}</div>
        <div className="mt-1 text-[9px] leading-[1.35] text-[#64748B]">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[11px] font-semibold text-white outline-none transition focus:border-[#2F80FF] focus:bg-white/[0.06]"
    />
  );
}

function CompanyProfile() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <PageHeader title="Company Profile" description="Configure your company profile" />

      <Card className="mt-4">
        <div className="border-b border-[var(--semlox-interactive-border)] px-4 py-3.5">
          <h2 className="semlox-section-title">Company Information</h2>
          <p className="semlox-metadata mt-1">
            Business details shown on all AWBs and invoices
          </p>
        </div>

        <div className="px-4">
          <FormField
            htmlFor="company-logo-upload"
            descriptionId="company-logo-help"
            label="Company Logo"
            description="PNG or SVG, max 2 MB. Displayed on issued AWBs."
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="semlox-section-title flex h-12 w-12 items-center justify-center rounded-[var(--semlox-radius-control)] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-[var(--semlox-text-inverse)]">
                DB
              </div>
              <Button id="company-logo-upload" variant="secondary" size="compact" aria-describedby="company-logo-help">
                <Upload className="h-3 w-3" />
                Upload new
              </Button>
              <Button variant="danger" size="compact">
                <Lock className="h-3 w-3" />
                Remove
              </Button>
            </div>
          </FormField>

          <FormField htmlFor="company-legal-name" descriptionId="company-legal-name-help" label="Legal Name" description="Official business name as registered.">
            <Input id="company-legal-name" aria-describedby="company-legal-name-help" defaultValue="DB Schenker Logistics GmbH" />
          </FormField>

          <FormField htmlFor="company-vat-id" descriptionId="company-vat-id-help" label="Tax / VAT ID" description="Used on customs declarations.">
            <Input id="company-vat-id" aria-describedby="company-vat-id-help" defaultValue="DE-198 749 023" />
          </FormField>

          <FormField htmlFor="company-address" descriptionId="company-address-help" label="Headquarters Address" description="Primary business location.">
            <Textarea
              id="company-address"
              aria-describedby="company-address-help"
              defaultValue={"Edmund-Rumpler-Strasse 3\n60549 Frankfurt am Main\nGermany"}
            />
          </FormField>

          <FormField htmlFor="company-contact-email" descriptionId="company-contact-email-help" label="Contact Email" description="For account notifications and billing.">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-[var(--semlox-icon-md)] w-[var(--semlox-icon-md)] -translate-y-1/2 text-[var(--semlox-text-muted)]" />
              <Input
                id="company-contact-email"
                type="email"
                aria-describedby="company-contact-email-help"
                defaultValue="ops@schenker.de"
                className="pl-8"
              />
            </div>
          </FormField>

          <FormField htmlFor="company-timezone" descriptionId="company-timezone-help" label="Time Zone" description="Affects timestamps shown in the dashboard.">
            <Select
              id="company-timezone"
              aria-describedby="company-timezone-help"
              defaultValue="Europe/Berlin (CET)"
              className="w-full"
            >
              <option>Europe/Berlin (CET)</option>
              <option>Asia/Karachi (PKT)</option>
              <option>UTC</option>
            </Select>
          </FormField>
        </div>
      </Card>
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--semlox-interactive-border)] pt-3 pb-5">
        <Button variant="secondary" size="standard">
          Cancel
        </Button>
        <Button variant="solid" size="standard">
          Save Changes
        </Button>
      </div>
    </div>
  );
}



const roleStyles: Record<string, string> = {
  Admin: "border-[#8B5CF6]/40 bg-[#8B5CF6]/20 text-[#C084FC]",
  Manager: "border-[#2F80FF]/40 bg-[#2F80FF]/18 text-[#60A5FA]",
  Operator: "border-[#00D4AA]/35 bg-[#00D4AA]/15 text-[#00D4AA]",
  Viewer: "border-white/[0.10] bg-white/[0.06] text-[#94A3B8]",
};

const statusStyles: Record<string, string> = {
  Active: "border-[#00D4AA]/35 bg-[#00D4AA]/15 text-[#00D4AA]",
  Invited: "border-[#F59E0B]/35 bg-[#F59E0B]/15 text-[#F59E0B]",
  Disabled: "border-white/[0.10] bg-white/[0.06] text-[#64748B]",
};

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex h-[18px] min-w-[54px] items-center justify-center rounded-full border px-2 font-mono text-[8px] font-bold ${className}`}>
      {children}
    </span>
  );
}

function IconButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-white/[0.09] bg-white/[0.025] text-[#64748B] hover:border-[#2F80FF]/50 hover:text-white">
      {children}
    </button>
  );
}

function useCompanyMembers(companyId: string | null) {
  const membersQuery = useCompanyMembersQuery(companyId);
  const refreshMembers = useCallback(async (force = false) => {
    if (!companyId) {
      return false;
    }
    if (!force && membersQuery.error?.status === 401) return false;
    const result = await membersQuery.refetch();
    if (result.error) {
      return false;
    }
    return true;
  }, [companyId, membersQuery]);

  return {
    members: membersQuery.data ?? null,
    loading: membersQuery.isPending || membersQuery.isFetching,
    error: membersQuery.error?.message ?? null,
    refreshMembers,
  };
}

const memberRoles = ["owner", "admin", "manager", "operator", "viewer"];

function normalizeMemberRole(role: unknown) {
  const normalized = String(role || "operator").toLowerCase();
  return memberRoles.includes(normalized) ? normalized : "operator";
}

function TeamMembers() {
  const { selectedCompanyId } = useCompany();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ fullName: "", email: "", role: "Operator", tempPassword: "", sendInvite: true });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "", severity: "info" });
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [memberActionLoading, setMemberActionLoading] = useState<Record<string, string | null>>({});
  const { members, loading: membersLoading, error: membersError, refreshMembers } = useCompanyMembers(selectedCompanyId);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (members || []).filter((member) => {
      const role = normalizeMemberRole(member.role);
      if (role === "owner") return false;
      const matchesRole = roleFilter === "All roles" || role === roleFilter.toLowerCase();
      const haystack = `${member.full_name || ""} ${member.email || ""}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesRole && matchesSearch;
    });
  }, [members, roleFilter, searchQuery]);

  const setMemberBusy = (userId: string, action: string | null) => {
    setMemberActionLoading((prev) => ({ ...prev, [userId]: action }));
  };

  const updateMemberRole = async (member: CompanyMember, nextRole: string) => {
    if (!selectedCompanyId || nextRole === normalizeMemberRole(member.role)) return;
    const roleLabel = nextRole.charAt(0).toUpperCase() + nextRole.slice(1);
    if (!window.confirm(`Change ${member.email || "this member"} to ${roleLabel}?`)) return;

    setMemberBusy(member.user_id, "role");
    try {
      const resp = await fetch("/api/company/members", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompanyId, userId: member.user_id, role: nextRole }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || j?.ok === false) {
        setToast({ message: j?.message || "Unable to update member role. Try again.", type: "error" });
        return;
      }
      setToast({ message: j?.message || "Role updated.", type: "success" });
      await refreshMembers(true);
    } catch (e) {
      setToast({ message: "Unable to update member role. Try again.", type: "error" });
    } finally {
      setMemberBusy(member.user_id, null);
    }
  };

  const resendInvite = async (member: CompanyMember) => {
    if (!selectedCompanyId || member.status !== "invited") return;
    setMemberBusy(member.user_id, "resend");
    try {
      const resp = await fetch("/api/company/members", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", companyId: selectedCompanyId, userId: member.user_id }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || j?.ok === false) {
        setToast({ message: j?.message || "Unable to resend invite. Try again.", type: "error" });
        return;
      }
      setToast({ message: j?.message || "Invite resent.", type: "success" });
      await refreshMembers(true);
    } catch (e) {
      setToast({ message: "Unable to resend invite. Try again.", type: "error" });
    } finally {
      setMemberBusy(member.user_id, null);
    }
  };

  const removeMember = async (member: CompanyMember) => {
    if (!selectedCompanyId) return;
    if (!window.confirm("Remove this member from the company? This will remove their access to this company but will not delete their account.")) return;

    setMemberBusy(member.user_id, "remove");
    try {
      const resp = await fetch("/api/company/members", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompanyId, userId: member.user_id }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || j?.ok === false) {
        setToast({ message: j?.message || "Unable to remove team member. Try again.", type: "error" });
        return;
      }
      setToast({ message: j?.message || "Member removed.", type: "success" });
      await refreshMembers(true);
    } catch (e) {
      setToast({ message: "Unable to remove team member. Try again.", type: "error" });
    } finally {
      setMemberBusy(member.user_id, null);
    }
  };

  const sendAnnouncement = async () => {
    if (!selectedCompanyId) {
      setAnnouncementMessage("No company selected. Please select a company first.");
      return;
    }

    setAnnouncementLoading(true);
    setAnnouncementMessage("");
    try {
      const response = await fetch("/api/notifications/announcement", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          title: announcementForm.title,
          message: announcementForm.message,
          severity: announcementForm.severity,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setAnnouncementMessage(payload?.message || "Unable to send announcement. Please try again.");
        return;
      }

      setToast({ message: payload?.message || "Announcement sent.", type: "success" });
      setAnnouncementForm({ title: "", message: "", severity: "info" });
      setAnnouncementOpen(false);
      window.dispatchEvent(new Event("semlox:notifications-changed"));
    } catch {
      setAnnouncementMessage("Unable to send announcement. Please try again.");
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const permissions = [
    ["Admin", "Full access - Manage team, billing, integrations, settings"],
    ["Manager", "Approve & issue AWBs, manage documents, view analytics"],
    ["Operator", "Upload & process AWBs, review extracted fields, save drafts"],
    ["Viewer", "View-only access to documents and analytics"],
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          Team Members
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your team members</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
            <div>
              <h3 className="text-[12px] font-extrabold text-white">Team Members</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">
                Manage who has access to your SemloX workspace
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <input
                placeholder="Search members..."
                value={searchQuery ?? ""}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-[170px] rounded-[6px] border border-white/[0.12] bg-white/[0.04] px-3 text-[10px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
              />
              <select
                value={roleFilter ?? "All roles"}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-7 w-[110px] rounded-[6px] border border-white/[0.12] bg-[#151925] px-2 text-[10px] font-bold text-white outline-none"
              >
                <option>All roles</option>
                <option>Admin</option>
                <option>Manager</option>
                <option>Operator</option>
                <option>Viewer</option>
              </select>
              <button
                type="button"
                disabled={membersLoading || !selectedCompanyId}
                onClick={async () => {
                  const refreshed = await refreshMembers(true);
                  if (!refreshed) {
                    setToast({ message: "Could not refresh team members.", type: "error" });
                  }
                }}
                className="flex h-7 items-center gap-1.5 rounded-[6px] border border-white/[0.12] bg-white/[0.035] px-2.5 text-[9px] font-bold text-[#94A3B8] transition hover:border-[#2F80FF]/50 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCw className={`h-3 w-3 ${membersLoading ? "animate-spin" : ""}`} />
                {membersLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnnouncementForm({ title: "", message: "", severity: "info" });
                  setAnnouncementMessage("");
                  setAnnouncementOpen(true);
                }}
                className="flex h-7 items-center gap-1.5 rounded-[7px] border border-cyan-400/25 bg-cyan-400/[0.08] px-3 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/[0.14]"
              >
                <Megaphone className="h-3 w-3" />
                Send Announcement
              </button>
              <button
                onClick={() => {
                  setInviteForm({ fullName: "", email: "", role: "Operator", tempPassword: "", sendInvite: true });
                  setInviteMessage("");
                  setInviteOpen(true);
                }}
                className="flex h-7 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-3 text-[10px] font-bold text-white"
              >
                <Plus className="h-3 w-3" />
                Add Member
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_1.05fr_120px] border-b border-white/[0.08] px-3 py-3 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#475569]">
            <div>Member</div>
            <div>Role</div>
            <div>Status</div>
            <div>Joined</div>
            <div>Last Active</div>
            <div />
          </div>

          {membersLoading && members === null ? (
            // loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid min-h-[43px] animate-pulse grid-cols-[2.2fr_1fr_1fr_1fr_1.05fr_120px] items-center border-b border-white/[0.06] px-3 text-[10px] last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5`} />
                  <div className="min-w-0">
                    <div className="h-3 w-36 rounded bg-white/6" />
                    <div className="mt-1 h-2 w-28 rounded bg-white/4" />
                  </div>
                </div>
                <div><div className="h-3 w-24 rounded bg-white/6" /></div>
                <div><div className="h-3 w-20 rounded bg-white/6" /></div>
                <div><div className="h-3 w-20 rounded bg-white/6" /></div>
                <div><div className="h-3 w-24 rounded bg-white/6" /></div>
                <div />
              </div>
            ))
          ) : membersError ? (
            <div className="p-4 text-[12px] text-red-400">{membersError}</div>
          ) : Array.isArray(filteredMembers) && filteredMembers.length === 0 ? (
            <div className="p-6 text-[13px] text-[#94a3b8]">No team members found.</div>
          ) : (
            (filteredMembers || []).map((member) => (
              <div key={member.user_id} className="grid min-h-[43px] grid-cols-[2.2fr_1fr_1fr_1fr_1.05fr_120px] items-center border-b border-white/[0.06] px-3 text-[10px] last:border-b-0">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white bg-[#64748B]`}>
                    {member.full_name ? member.full_name.split(" ").map((s: string) => s[0]).slice(0,2).join("") : "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-extrabold text-white">{member.full_name || member.email}</div>
                    <div className="truncate font-mono text-[8px] text-[#64748B]">{member.email}</div>
                  </div>
                </div>
                <div>
                  <select
                    value={normalizeMemberRole(member.role)}
                    disabled={memberActionLoading[member.user_id] === "role"}
                    onChange={(e) => updateMemberRole(member, e.target.value)}
                    className="h-6 w-[86px] rounded-[6px] border border-white/[0.10] bg-[#151925] px-2 text-[9px] font-bold text-white outline-none disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <Pill className={statusStyles[member.status === "invited" ? "Invited" : member.status === "disabled" ? "Disabled" : "Active"]}>
                    <span className="mr-1 h-1 w-1 rounded-full bg-current" />
                    {member.status}
                  </Pill>
                </div>
                <div className="font-mono text-[10px] text-[#64748B]">{member.created_at ? new Date(member.created_at).toLocaleDateString() : "-"}</div>
                <div className="font-mono text-[10px] text-[#64748B]">{member.last_active || "-"}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={member.status === "invited" ? "Resend invite" : "Invite can only be resent to pending users"}
                    disabled={member.status !== "invited" || memberActionLoading[member.user_id] === "resend"}
                    onClick={() => resendInvite(member)}
                    className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-white/[0.09] bg-white/[0.025] text-[#64748B] hover:border-[#2F80FF]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCw className={`h-3 w-3 ${memberActionLoading[member.user_id] === "resend" ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    type="button"
                    title="Remove member"
                    disabled={memberActionLoading[member.user_id] === "remove"}
                    onClick={() => removeMember(member)}
                    className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-white/[0.09] bg-white/[0.025] text-[#64748B] hover:border-red-400/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Role Permissions</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">
              What each role can do in your workspace
            </p>
          </div>

          <div className="px-4 py-4">
            {permissions.map(([role, description]) => (
              <div key={role} className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0">
                <Pill className={roleStyles[role]}>{role}</Pill>
                <div className="text-[11px] font-semibold text-[#CBD5E1]">{description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#020617]/70 backdrop-blur-[5px]">
          <div className="w-[430px] overflow-hidden rounded-[12px] border border-white/[0.10] bg-[#090d18] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
            <div className="flex items-start border-b border-white/[0.08] px-5 py-4">
              <div>
                <h3 className="text-[14px] font-extrabold text-white">Invite Team Member</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">
                  Send an invite link for password setup
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="ml-auto flex h-6 w-6 items-center justify-center rounded-[6px] border border-white/[0.10] text-[#64748B] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Full Name</span>
                <input
                  placeholder="e.g. Felix Hartmann"
                  value={inviteForm.fullName ?? ""}
                  onChange={(e) => setInviteForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[11px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Email Address</span>
                <input
                  placeholder="felix@schenker.de"
                  value={inviteForm.email ?? ""}
                  onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[11px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Role</span>
                <select
                  value={inviteForm.role ?? "Operator"}
                  onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                  className="mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-bold text-white outline-none focus:border-[#2F80FF]"
                  disabled={inviteLoading}
                >
                  <option value="Operator">Operator — Upload & process</option>
                  <option value="Manager">Manager — Approve & issue</option>
                  <option value="Viewer">Viewer — View only</option>
                  <option value="Admin">Admin — Full access</option>
                </select>
              </label>

              {inviteForm.sendInvite && (
                <div className="rounded-[7px] border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-2 text-[10px] font-semibold text-cyan-200">
                  The user will set their password from the invitation email.
                </div>
              )}

              {!inviteForm.sendInvite && process.env.NODE_ENV !== "production" && (
              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">
                  Temporary Password <span className="font-normal">(optional — leave blank to send invite link)</span>
                </span>
                <input
                  placeholder="Auto-generate or set manually"
                  value={inviteForm.tempPassword ?? ""}
                  onChange={(e) => setInviteForm((p) => ({ ...p, tempPassword: e.target.value }))}
                  className="mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[11px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
                />
              </label>
              )}

              {!inviteForm.sendInvite && process.env.NODE_ENV === "production" && (
                <div className="rounded-[7px] border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2 text-[10px] font-semibold text-amber-200">
                  Direct password creation is disabled in production. Send an invitation email instead.
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Toggle enabled={inviteForm.sendInvite} onClick={() => setInviteForm((p) => ({ ...p, sendInvite: !p.sendInvite }))} />
                <div>
                  <div className="text-[11px] font-extrabold text-white">Send invitation email</div>
                  <div className="mt-0.5 text-[8px] text-[#64748B]">
                    User must accept invite to set their password and log in
                  </div>
                </div>
              </div>
            </div>
              <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-3">
              <button
                onClick={() => setInviteOpen(false)}
                className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.03] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {inviteMessage && <div className="text-[12px] text-cyan-300">{inviteMessage}</div>}
                <button
                  onClick={async () => {
                    setInviteLoading(true);
                    setInviteMessage("");
                    const companyId = selectedCompanyId;
                    if (!companyId) {
                      setInviteMessage("No company selected. Please select a company first.");
                      setInviteLoading(false);
                      return;
                    }

                    try {
                      if (process.env.NODE_ENV !== "production") console.log("[invite-ui] sending invite", { email: inviteForm.email, role: inviteForm.role, sendInvite: inviteForm.sendInvite });
                      const headers: Record<string, string> = { "Content-Type": "application/json" };

                      const res = await fetch("/api/invite", {
                        method: "POST",
                        credentials: "include",
                        headers,
                        body: JSON.stringify({
                          fullName: inviteForm.fullName,
                          email: inviteForm.email,
                          role: inviteForm.role.toLowerCase(),
                          tempPassword: inviteForm.sendInvite ? undefined : inviteForm.tempPassword || undefined,
                          companyId,
                          sendInvite: inviteForm.sendInvite,
                        }),
                      });

                      const j = await res.json();
                      if (!res.ok) {
                        setInviteMessage(j.message || "Invite failed");
                      } else {
                        if (process.env.NODE_ENV !== "production") console.log("[invite-ui] invite response", { status: res.status });
                        // Success: show toast, refresh members, close modal shortly
                        const successMessage = j?.message || "Invitation sent. The user must open the email and set their password before signing in.";
                        setInviteMessage(successMessage);
                        // refresh members list
                        try {
                          await refreshMembers(true);
                        } catch (e) {}
                        // show success toast/banner
                        setToast({ message: successMessage, type: "success" });
                        setTimeout(() => {
                          setInviteForm({ fullName: "", email: "", role: "Operator", tempPassword: "", sendInvite: true });
                          setInviteOpen(false);
                        }, 900);
                      }
                    } catch (e) {
                      setInviteMessage("Invite failed");
                    }
                    setInviteLoading(false);
                  }}
                  disabled={inviteLoading}
                  className="flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[11px] font-bold text-white disabled:opacity-70"
                >
                  <Plus className="h-3 w-3" />
                  {inviteLoading ? "Sending invite..." : "Add Member"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {announcementOpen && (
        <div className="settings-announcement-overlay fixed inset-0 z-[500] flex items-center justify-center bg-[#020617]/70 backdrop-blur-[5px]">
          <div className="settings-announcement-modal w-[430px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[12px] border border-white/[0.10] bg-[#090d18] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
            <div className="settings-announcement-header flex items-start border-b border-white/[0.08] px-5 py-4">
              <div>
                <h3 className="text-[14px] font-extrabold text-white">Send Workspace Announcement</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">
                  Notify all accepted members of this workspace
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnnouncementOpen(false)}
                disabled={announcementLoading}
                className="settings-announcement-close ml-auto flex h-6 w-6 items-center justify-center rounded-[6px] border border-white/[0.10] text-[#64748B] hover:text-white disabled:opacity-50"
                aria-label="Close announcement"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Title</span>
                <input
                  value={announcementForm.title ?? ""}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                  maxLength={120}
                  placeholder="Workspace update"
                  disabled={announcementLoading}
                  className="settings-announcement-field mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[11px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF] disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Message</span>
                <textarea
                  value={announcementForm.message ?? ""}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))}
                  maxLength={500}
                  rows={5}
                  placeholder="Share an update with the workspace."
                  disabled={announcementLoading}
                  className="settings-announcement-field mt-1 w-full resize-none rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 py-2 text-[11px] font-semibold leading-5 text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF] disabled:opacity-60"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-[#64748B]">Severity</span>
                <select
                  value={announcementForm.severity ?? "info"}
                  onChange={(event) => setAnnouncementForm((current) => ({ ...current, severity: event.target.value }))}
                  disabled={announcementLoading}
                  className="settings-announcement-field mt-1 h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-bold text-white outline-none focus:border-[#2F80FF] disabled:opacity-60"
                >
                  <option value="info">Information</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Urgent</option>
                </select>
              </label>

              {announcementMessage ? (
                <div className="rounded-[7px] border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-[10px] font-semibold text-red-300">
                  {announcementMessage}
                </div>
              ) : null}
            </div>

            <div className="settings-announcement-footer flex justify-end gap-2 border-t border-white/[0.08] px-5 py-3">
              <button
                type="button"
                onClick={() => setAnnouncementOpen(false)}
                disabled={announcementLoading}
                className="settings-announcement-cancel h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.03] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendAnnouncement}
                disabled={announcementLoading || !announcementForm.title.trim() || !announcementForm.message.trim()}
                className="flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[11px] font-bold text-white disabled:opacity-50"
              >
                <Megaphone className="h-3 w-3" />
                {announcementLoading ? "Sending..." : "Send Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast banner */}
      {toast && (
        <div className={`fixed right-6 top-16 z-[999] rounded-[8px] px-4 py-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"} text-white`}>{toast.message}</div>
      )}
    </div>
  );
}

function ApiWebhooks() {
  const apiKeys = [
    {
      name: "Production",
      key: "slx_live_.............a8f3",
      created: "Created 15 Jan 2025",
      used: "Last used 2 min ago",
    },
    {
      name: "Staging",
      key: "slx_test_.............c91d",
      created: "Created 02 Feb 2025",
      used: "Last used 18 h ago",
    },
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          API & Webhooks
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your api & webhooks</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
            <div>
              <h3 className="text-[12px] font-extrabold text-white">API Keys</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">
                Programmatic access to the SemloX engine
              </p>
            </div>
            <button className="ml-auto flex h-8 items-center gap-1.5 rounded-[7px] bg-[#2F80FF] px-4 text-[11px] font-bold text-white hover:bg-[#3B8BFF]">
              <Plus className="h-3 w-3" />
              Create Key
            </button>
          </div>

          <div className="space-y-2 px-4 py-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.name} className="grid min-h-[50px] grid-cols-[1fr_180px_88px] items-center rounded-[7px] border border-white/[0.10] bg-white/[0.035] px-3">
                <div>
                  <div className="text-[11px] font-extrabold text-white">{apiKey.name}</div>
                  <div className="mt-1 font-mono text-[10px] font-bold tracking-[0.08em] text-[#64748B]">
                    {apiKey.key}
                  </div>
                </div>
                <div className="text-right font-mono text-[8px] leading-[1.35] text-[#64748B]">
                  <div>{apiKey.created}</div>
                  <div>{apiKey.used}</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <IconButton><Copy className="h-3 w-3" /></IconButton>
                  <IconButton><RotateCw className="h-3 w-3" /></IconButton>
                  <IconButton><Trash2 className="h-3 w-3" /></IconButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
            <div>
              <h3 className="text-[12px] font-extrabold text-white">Webhooks</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">
                Receive AWB events at your endpoint
              </p>
            </div>
            <button className="ml-auto flex h-8 items-center gap-1.5 rounded-[7px] bg-[#2F80FF] px-4 text-[11px] font-bold text-white hover:bg-[#3B8BFF]">
              <Plus className="h-3 w-3" />
              Add Webhook
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="flex min-h-[50px] items-center rounded-[7px] border border-white/[0.10] bg-white/[0.035] px-3">
              <div>
                <div className="text-[11px] font-extrabold text-white">
                  https://schenker.de/api/semlox/webhook
                </div>
                <div className="mt-1 text-[9px] font-semibold text-[#64748B]">
                  Listens to: <span className="text-[#2F80FF]">awb.processed</span> · <span className="text-[#2F80FF]">awb.issued</span>
                </div>
              </div>
              <Pill className="ml-auto border-[#00D4AA]/35 bg-[#00D4AA]/15 text-[#00D4AA]">
                Active
              </Pill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const integrations = [
  ["SAP TM", "Transport Management", "Connected", "Configure", "📦"],
  ["CargoWise", "Freight forwarding", "Connected", "Configure", "🚚"],
  ["IATA e-freight", "AWB submission", "Connected", "Configure", "☁"],
  ["Microsoft Dynamics", "ERP sync", "Not connected", "Connect", "🔗"],
  ["Slack", "Exception alerts", "Connected", "Configure", "💬"],
  ["Google Sheets", "Export reports", "Not connected", "Connect", "📊"],
  ["Okta SSO", "Identity provider", "Connected", "Configure", "🔐"],
  ["Outlook 365", "Email parsing", "Not connected", "Connect", "✉"],
];

function Integrations() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          Integrations
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your integrations</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Integrations</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">
              Connect SemloX to your TMS, WMS, and ERP
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 px-4 py-4">
            {integrations.map(([name, description, status, action, icon]) => {
              const connected = status === "Connected";
              return (
                <div key={name} className="rounded-[8px] border border-white/[0.10] bg-white/[0.035] p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-[#2F80FF]/30 bg-[#123D8A]/50 text-[15px]">
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-extrabold leading-tight text-white">
                        {name}
                      </div>
                      <div className="mt-1 text-[9px] leading-none text-[#64748B]">
                        {description}
                      </div>
                    </div>
                    <span
                      className={`rounded-[4px] px-2 py-1 font-mono text-[8px] font-bold ${
                        connected
                          ? "bg-[#00D4AA]/15 text-[#00D4AA]"
                          : "bg-white/[0.06] text-[#64748B]"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <button className="mt-3 h-8 w-full rounded-[7px] border border-white/[0.10] bg-white/[0.02] text-[10px] font-bold text-[#64748B] hover:border-[#2F80FF]/40 hover:text-white">
                    {action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onClick }: { enabled: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[18px] w-[32px] rounded-full transition ${
        enabled ? "bg-[#2F80FF]" : "bg-white/[0.18]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-3 w-3 rounded-full bg-white transition ${
          enabled ? "left-[17px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function Notifications() {
  const items = [
    {
      title: "AWB processing complete",
      description: "Email when an AWB finishes extracting successfully",
      enabled: true,
    },
    {
      title: "Processing failures",
      description: "Notify when an AWB cannot be parsed and needs manual review",
      enabled: true,
    },
    {
      title: "Weekly summary",
      description: "Friday digest with volume and success rate",
      enabled: true,
    },
    {
      title: "Quota alerts",
      description: "Alert when monthly quota crosses 80% and 95%",
      enabled: true,
    },
    {
      title: "Team changes",
      description: "When a member is added, removed, or changes role",
      enabled: false,
    },
    {
      title: "Integration events",
      description: "Failures or disconnects on connected services",
      enabled: false,
    },
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          Notifications
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your notifications</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Email Notifications</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">
              What we&apos;ll email you about
            </p>
          </div>

          <div className="px-4 py-3">
            {items.map((item) => (
              <div key={item.title} className="flex min-h-[47px] items-center border-b border-white/[0.06] last:border-b-0">
                <div>
                  <div className="text-[12px] font-extrabold text-white">{item.title}</div>
                  <div className="mt-1 text-[9px] text-[#64748B]">{item.description}</div>
                </div>
                <div className="ml-auto">
                  <Toggle enabled={item.enabled} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Security() {
  const authRows = [
    {
      title: "Require 2FA for all members",
      description: "Members must set up a second factor before accessing the workspace",
      enabled: true,
    },
    {
      title: "SSO via Okta",
      description: "Sign in with your company identity provider",
      enabled: true,
    },
    {
      title: "Allow password sign-in",
      description: "Permit fallback to email + password",
      enabled: false,
    },
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          Security
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your security</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Authentication</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">
              Secure how your team signs in
            </p>
          </div>

          <div className="px-4 py-3">
            {authRows.map((row) => (
              <div key={row.title} className="flex min-h-[47px] items-center border-b border-white/[0.06] last:border-b-0">
                <div>
                  <div className="text-[12px] font-extrabold text-white">{row.title}</div>
                  <div className="mt-1 text-[9px] text-[#64748B]">{row.description}</div>
                </div>
                <div className="ml-auto">
                  <Toggle enabled={row.enabled} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Session & IP</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">
              Lockdown of access
            </p>
          </div>

          <div className="px-4 py-4">
            <FieldRow label="Session timeout" hint="Auto sign-out after inactivity.">
              <select
                defaultValue="60 minutes"
                className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]"
              >
                <option>60 minutes</option>
                <option>30 minutes</option>
                <option>2 hours</option>
              </select>
            </FieldRow>
            <FieldRow label="IP Allowlist" hint="Only let these IPs access your workspace. Leave empty for no restriction.">
              <textarea
                placeholder="e.g. 192.168.1.0/24, 87.143.21.10"
                className="min-h-[56px] w-full resize-y rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 py-2 text-[11px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
              />
            </FieldRow>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-[#EF4444]">Danger Zone</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">Irreversible actions</p>
          </div>

          <div className="flex min-h-[70px] items-center px-4">
            <div>
              <div className="text-[12px] font-extrabold text-white">Delete workspace</div>
              <div className="mt-1 text-[9px] text-[#64748B]">
                All documents, members, and audit logs will be permanently removed.
              </div>
            </div>
            <button className="ml-auto flex h-8 items-center gap-1.5 rounded-[7px] border border-[#EF4444]/45 bg-[#EF4444]/10 px-4 text-[11px] font-bold text-[#EF4444]">
              <Trash2 className="h-3 w-3" />
              Delete workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingPlan() {
  const invoices = [
    ["INV-2026-04", "01 Apr 2026", "€1,899.00", "Paid"],
    ["INV-2026-03", "01 Mar 2026", "€1,899.00", "Paid"],
    ["INV-2026-02", "01 Feb 2026", "€1,899.00", "Paid"],
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          Billing & Plan
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your billing & plan</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="rounded-[10px] border border-[#2F80FF]/50 bg-[#2F80FF]/[0.06] px-4 py-4">
          <div className="text-[18px] font-extrabold tracking-[-0.03em] text-white">
            Enterprise Plan · €1,899/mo
          </div>
          <p className="mt-1 text-[9px] text-[#64748B]">
            Billed annually · Renews 15 Jan 2027 · 14-day refund window
          </p>

          <div className="mt-4 flex items-center justify-between text-[11px] font-extrabold text-[#CBD5E1]">
            <span>AWB processing quota</span>
            <span className="font-mono text-white">4,823 / 10,000</span>
          </div>
          <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full w-[48%] rounded-full bg-gradient-to-r from-[#2F80FF] to-[#00C6FF]" />
          </div>

          <div className="mt-4 flex gap-2">
            <button className="flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[11px] font-bold text-white">
              <Plus className="h-3 w-3" />
              Upgrade Plan
            </button>
            <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white">
              Change billing cycle
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
            <div>
              <h3 className="text-[12px] font-extrabold text-white">Payment Method</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">Cards on file</p>
            </div>
            <button className="ml-auto flex h-8 items-center gap-1.5 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white">
              <Plus className="h-3 w-3" />
              Add card
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="flex min-h-[48px] items-center rounded-[7px] border border-white/[0.10] bg-white/[0.035] px-3">
              <div className="flex h-7 w-9 items-center justify-center rounded-[5px] bg-[#1D4ED8] text-[9px] font-extrabold text-white">
                VISA
              </div>
              <div className="ml-3">
                <div className="font-mono text-[11px] font-extrabold text-white">•••• •••• •••• 4912</div>
                <div className="mt-1 text-[9px] text-[#64748B]">Expires 09/2028 · Anna Keller</div>
              </div>
              <Pill className="ml-auto border-[#00D4AA]/35 bg-[#00D4AA]/15 text-[#00D4AA]">
                Default
              </Pill>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-white">Invoices</h3>
            <p className="mt-1 text-[9px] text-[#64748B]">Recent billing history</p>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_120px] border-b border-white/[0.08] px-4 py-3 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#475569]">
            <div>Invoice</div>
            <div>Date</div>
            <div>Amount</div>
            <div>Status</div>
            <div />
          </div>

          {invoices.map(([invoice, date, amount, status]) => (
            <div key={invoice} className="grid min-h-[42px] grid-cols-[1fr_1fr_1fr_1fr_120px] items-center border-b border-white/[0.06] px-4 text-[11px] font-semibold text-[#CBD5E1] last:border-b-0">
              <div className="font-mono font-extrabold text-white">{invoice}</div>
              <div>{date}</div>
              <div className="font-mono">{amount}</div>
              <div>
                <Pill className="border-[#00D4AA]/35 bg-[#00D4AA]/15 text-[#00D4AA]">
                  {status}
                </Pill>
              </div>
              <button className="h-7 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-3 text-[10px] font-semibold text-[#64748B] hover:text-white">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileFieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-5 border-b border-white/[0.06] py-3 last:border-b-0">
      <div>
        <div className="text-[11px] font-extrabold text-white">{label}</div>
        <div className="mt-1 text-[9px] leading-[1.35] text-[#64748B]">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function MyProfile() {
  const gradients = [
    "from-[#3B82F6] to-[#8B5CF6]",
    "from-[#2F80FF] to-[#00C6FF]",
    "from-[#14B8A6] to-[#00D4AA]",
    "from-[#FF6B3D] to-[#EF4444]",
    "from-[#6366F1] to-[#2F80FF]",
    "from-[#0EA5E9] to-[#06B6D4]",
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-4">
      <div className="shrink-0">
        <h2 className="text-[22px] font-extrabold tracking-[-0.045em] text-white">
          My Profile
        </h2>
        <p className="mt-1 text-[11px] text-[#64748B]">Configure your personal account</p>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 pb-7">
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_370px] gap-4">
          <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
            <div className="border-b border-white/[0.08] px-4 py-3">
              <h3 className="text-[12px] font-extrabold text-white">Personal Information</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">
                Your details visible to your team
              </p>
            </div>

            <div className="px-4">
              <ProfileFieldRow label="Full Name" hint="Shown on issued AWBs you process.">
                <div className="grid grid-cols-2 gap-2">
                  <TextInput defaultValue="Anna" />
                  <TextInput defaultValue="Keller" />
                </div>
              </ProfileFieldRow>

              <ProfileFieldRow label="Display Name" hint="How you appear in the activity feed.">
                <TextInput defaultValue="Anna K." />
              </ProfileFieldRow>

              <ProfileFieldRow label="Email" hint="Used for sign-in and notifications.">
                <div className="flex gap-2">
                  <TextInput defaultValue="anna.keller@schenker.de" />
                  <span className="flex h-8 items-center gap-1 rounded-[7px] bg-[#00D4AA]/15 px-3 text-[10px] font-bold text-[#00D4AA]">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                </div>
              </ProfileFieldRow>

              <ProfileFieldRow label="Job Title" hint="Your role within the company.">
                <TextInput defaultValue="Operations Manager — Air Freight" />
              </ProfileFieldRow>

              <ProfileFieldRow label="Phone" hint="For account recovery only.">
                <TextInput defaultValue="+49 (0) 69 12 345 6789" />
              </ProfileFieldRow>

              <ProfileFieldRow label="Department" hint="Helps route documents to the right team.">
                <select defaultValue="Air Freight Operations" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>Air Freight Operations</option>
                  <option>Finance</option>
                  <option>Compliance</option>
                </select>
              </ProfileFieldRow>

              <ProfileFieldRow label="Time Zone" hint="Affects timestamps and notification windows.">
                <select defaultValue="Europe/Berlin (CET — UTC+1)" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>Europe/Berlin (CET — UTC+1)</option>
                  <option>Asia/Karachi (PKT — UTC+5)</option>
                  <option>UTC</option>
                </select>
              </ProfileFieldRow>

              <ProfileFieldRow label="Language" hint="Interface language.">
                <select defaultValue="English" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>English</option>
                  <option>Deutsch</option>
                </select>
              </ProfileFieldRow>

              <div className="flex justify-end gap-2 py-3">
                <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.03] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white">
                  Cancel
                </button>
                <button className="flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[11px] font-bold text-white">
                  <Check className="h-3 w-3" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <h3 className="text-[12px] font-extrabold text-white">Profile Picture</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">PNG, JPG, or pick a color gradient</p>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-[24px] font-extrabold text-white">
                    AK
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-white">Use initials with color</div>
                    <div className="mt-1 text-[9px] text-[#64748B]">Or upload a picture (max 5 MB)</div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex h-7 items-center gap-1.5 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-3 text-[10px] font-semibold text-[#64748B] hover:text-white">
                        <Upload className="h-3 w-3" />
                        Upload Photo
                      </button>
                      <button className="flex h-7 items-center gap-1.5 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-3 text-[10px] font-semibold text-[#64748B] hover:text-white">
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[#64748B]">
                  Gradient Options
                </div>
                <div className="mt-2 flex gap-2">
                  {gradients.map((gradient, index) => (
                    <button
                      key={gradient}
                      className={`flex h-10 w-10 items-center justify-center rounded-[9px] bg-gradient-to-br ${gradient} text-[15px] font-extrabold text-white ${
                        index === 0 ? "ring-2 ring-[#2F80FF]" : ""
                      }`}
                    >
                      AK
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <h3 className="text-[12px] font-extrabold text-white">Your Company</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">Workspace you belong to</p>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-[16px] font-extrabold text-white">
                    DB
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-white">DB Schenker Logistics</div>
                    <div className="mt-1 text-[9px] text-[#64748B]">Enterprise Plan · 6 members</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.025] text-[10px] font-semibold text-[#64748B] hover:text-white">
                    Manage
                  </button>
                  <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.025] text-[10px] font-semibold text-[#64748B] hover:text-white">
                    Switch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

void MyProfile;

function MyProfileDashboard() {
  const stats = [
    ["AWBS PROCESSED", "1,247", "Personal · all time", "text-[#2F80FF]", "border-t-[#00C6FF]"],
    ["SUCCESS RATE", "98.4%", "↑ 0.6% vs last month", "text-[#00D4AA]", "border-t-[#00D4AA]"],
    ["AVG. PROCESS TIME", "1.8s", "Across all your docs", "text-[#8B5CF6]", "border-t-[#8B5CF6]"],
    ["THIS MONTH", "312", "Documents handled", "text-[#F59E0B]", "border-t-[#F59E0B]"],
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-7 py-5">
      <div className="shrink-0 border-y border-white/[0.10] py-4">
        <div className="grid grid-cols-4 gap-3">
          {stats.map(([label, value, caption, color, borderColor]) => (
            <div key={label} className={`rounded-[10px] border border-white/[0.10] border-t-2 ${borderColor} bg-white/[0.025] px-4 py-3`}>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                {label}
              </div>
              <div className={`mt-2 font-mono text-[24px] font-extrabold leading-none ${color}`}>
                {value}
              </div>
              <div className="mt-2 text-[9px] text-[#64748B]">{caption}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-7">
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_370px] gap-4">
          <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
            <div className="border-b border-white/[0.08] px-4 py-3">
              <h3 className="text-[12px] font-extrabold text-white">Personal Information</h3>
              <p className="mt-1 text-[9px] text-[#64748B]">
                Your details visible to your team
              </p>
            </div>

            <div className="px-4">
              <ProfileFieldRow label="Full Name" hint="Shown on issued AWBs you process.">
                <div className="grid grid-cols-2 gap-2">
                  <TextInput defaultValue="Anna" />
                  <TextInput defaultValue="Keller" />
                </div>
              </ProfileFieldRow>
              <ProfileFieldRow label="Display Name" hint="How you appear in the activity feed.">
                <TextInput defaultValue="Anna K." />
              </ProfileFieldRow>
              <ProfileFieldRow label="Email" hint="Used for sign-in and notifications.">
                <div className="flex gap-2">
                  <TextInput defaultValue="anna.keller@schenker.de" />
                  <span className="flex h-8 items-center gap-1 rounded-[7px] bg-[#00D4AA]/15 px-3 text-[10px] font-bold text-[#00D4AA]">
                    <Check className="h-3 w-3" />
                    Verified
                  </span>
                </div>
              </ProfileFieldRow>
              <ProfileFieldRow label="Job Title" hint="Your role within the company.">
                <TextInput defaultValue="Operations Manager — Air Freight" />
              </ProfileFieldRow>
              <ProfileFieldRow label="Phone" hint="For account recovery only.">
                <TextInput defaultValue="+49 (0) 69 12 345 6789" />
              </ProfileFieldRow>
              <ProfileFieldRow label="Department" hint="Helps route documents to the right team.">
                <select defaultValue="Air Freight Operations" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>Air Freight Operations</option>
                  <option>Finance</option>
                  <option>Compliance</option>
                </select>
              </ProfileFieldRow>
              <ProfileFieldRow label="Time Zone" hint="Affects timestamps and notification windows.">
                <select defaultValue="Europe/Berlin (CET — UTC+1)" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>Europe/Berlin (CET — UTC+1)</option>
                  <option>Asia/Karachi (PKT — UTC+5)</option>
                  <option>UTC</option>
                </select>
              </ProfileFieldRow>
              <ProfileFieldRow label="Language" hint="Interface language.">
                <select defaultValue="English" className="h-8 w-full rounded-[7px] border border-white/[0.12] bg-[#151925] px-3 text-[11px] font-semibold text-white outline-none focus:border-[#2F80FF]">
                  <option>English</option>
                  <option>Deutsch</option>
                </select>
              </ProfileFieldRow>

              <div className="flex justify-end gap-2 py-3">
                <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.03] px-4 text-[11px] font-semibold text-[#64748B] hover:text-white">
                  Cancel
                </button>
                <button className="flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-4 text-[11px] font-bold text-white">
                  <Check className="h-3 w-3" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <h3 className="text-[12px] font-extrabold text-white">Profile Picture</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">PNG, JPG, or pick a color gradient</p>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-[24px] font-extrabold text-white">
                    AK
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-white">Use initials with color</div>
                    <div className="mt-1 text-[9px] text-[#64748B]">Or upload a picture (max 5 MB)</div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex h-7 items-center gap-1.5 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-3 text-[10px] font-semibold text-[#64748B] hover:text-white">
                        <Upload className="h-3 w-3" />
                        Upload Photo
                      </button>
                      <button className="flex h-7 items-center gap-1.5 rounded-[7px] border border-white/[0.10] bg-white/[0.025] px-3 text-[10px] font-semibold text-[#64748B] hover:text-white">
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[10px] border border-white/[0.10] bg-white/[0.025]">
              <div className="border-b border-white/[0.08] px-4 py-3">
                <h3 className="text-[12px] font-extrabold text-white">Your Company</h3>
                <p className="mt-1 text-[9px] text-[#64748B]">Workspace you belong to</p>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-[16px] font-extrabold text-white">
                    DB
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-white">DB Schenker Logistics</div>
                    <div className="mt-1 text-[9px] text-[#64748B]">Enterprise Plan · 6 members</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.025] text-[10px] font-semibold text-[#64748B] hover:text-white">
                    Manage
                  </button>
                  <button className="h-8 rounded-[7px] border border-white/[0.10] bg-white/[0.025] text-[10px] font-semibold text-[#64748B] hover:text-white">
                    Switch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const allSettingsSections = new Set<SettingsSection>([
  "company",
  "team",
  "api",
  "integrations",
  "notifications",
  "security",
  "billing",
  "profile",
  "preferences",
  "workspace",
]);

const userSettingsSections = new Set<UserSettingsSection>([
  "profile",
  "security",
  "notifications",
  "preferences",
  "workspace",
]);

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const [currentMembership, setCurrentMembership] = useState<AuthMembership | null>(null);

  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const membershipsQuery = useMemberships();

  useEffect(() => {
    if (membershipsQuery.isPending) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (membershipsQuery.isError) {
        const status = membershipErrorStatus(membershipsQuery.error);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", status);
        if (status === 401 || status === 403) {
          if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] redirect reason: unauthorized");
          router.replace("/login");
          return;
        }
        setAllowed(true);
        return;
      }

      const memberships: AuthMembership[] = membershipsQuery.data || [];
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", 200, memberships.length);

      let effectiveCompanyId = selectedCompanyId;
      if (!selectedCompanyId && memberships.length === 1) {
        const cid = memberships[0].company_id;
        effectiveCompanyId = cid;
        setSelectedCompanyId(cid, true);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] selectedCompanyId", cid);
      }

      const membership =
        memberships.find((item) => item.company_id === effectiveCompanyId) ||
        (memberships.length === 1 ? memberships[0] : null);
      setCurrentMembership(membership);
      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    membershipsQuery.data,
    membershipsQuery.error,
    membershipsQuery.isError,
    membershipsQuery.isPending,
    router,
    selectedCompanyId,
    setSelectedCompanyId,
  ]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070B17]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
      </main>
    );
  }

  const currentRole = String(currentMembership?.role || "").toLowerCase();
  const showUserSettings =
    currentRole === "manager" || currentRole === "operator" || currentRole === "viewer";
  const requestedSection = searchParams.get("section");
  const activeSection: SettingsSection =
    requestedSection && allSettingsSections.has(requestedSection as SettingsSection)
      ? (requestedSection as SettingsSection)
      : showUserSettings
        ? "profile"
        : "company";
  const safeUserSection: UserSettingsSection =
    userSettingsSections.has(activeSection as UserSettingsSection)
      ? (activeSection as UserSettingsSection)
      : "profile";
  const safeAdminSection = showUserSettings
    ? safeUserSection
    : activeSection;

  const changeSection = (section: SettingsSection) => {
    const nextSection = showUserSettings && !userSettingsSections.has(section as UserSettingsSection)
      ? "profile"
      : section;
    router.push(`/dashboard/settings?section=${nextSection}`);
  };

  return (
    <div className="settings-page flex h-full bg-[linear-gradient(rgba(47,128,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(47,128,255,0.055)_1px,transparent_1px)] bg-[size:72px_72px] text-white">
      {showUserSettings ? (
        <UserSettingsView
          companyId={currentMembership?.company_id || selectedCompanyId}
          role={currentMembership?.role}
          initialSection={safeUserSection}
        />
      ) : (
        <>
          <SettingsSideNav activeSection={safeAdminSection} onSectionChange={changeSection} />
          {safeAdminSection === "profile" ||
          safeAdminSection === "preferences" ||
          safeAdminSection === "workspace" ? (
            <UserSettingsView
              companyId={currentMembership?.company_id || selectedCompanyId}
              role={currentMembership?.role}
              activeSection={safeAdminSection}
              onSectionChange={(section) => changeSection(section)}
              showNavigation={false}
            />
          ) : safeAdminSection === "team" ? (
            <TeamMembers />
          ) : safeAdminSection === "api" ? (
            <ApiWebhooks />
          ) : safeAdminSection === "integrations" ? (
            <Integrations />
          ) : safeAdminSection === "notifications" ? (
            <Notifications />
          ) : safeAdminSection === "security" ? (
            <Security />
          ) : safeAdminSection === "billing" ? (
            <BillingPlan />
          ) : (
            <CompanyProfile />
          )}
        </>
      )}
      <style jsx global>{`
        .dashboard-theme-light .settings-page {
          background-color: #f4f7fb !important;
          background-image: linear-gradient(rgba(47, 128, 255, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(47, 128, 255, 0.045) 1px, transparent 1px) !important;
          color: #111827 !important;
        }

        .dashboard-theme-light .settings-page aside:not(:first-child),
        .dashboard-theme-light .settings-page aside.w-\\[210px\\] {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
        }

        .dashboard-theme-light .settings-page aside.w-\\[210px\\] {
          box-shadow: inset -1px 0 0 #d5deea;
        }

        .dashboard-theme-light .settings-page aside.w-\\[210px\\] button {
          color: #334155 !important;
          font-weight: 700;
        }

        .dashboard-theme-light .settings-page aside.w-\\[210px\\] button:hover {
          background-color: #eef4ff !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .settings-page aside.w-\\[210px\\] button.border {
          background-color: #eef4ff !important;
          border-color: #2563eb !important;
          color: #0f172a !important;
          box-shadow: inset 3px 0 0 #2f80ff, 0 8px 18px rgba(37, 99, 235, 0.08);
        }

        .dashboard-theme-light .settings-page aside.w-\\[210px\\] button.border svg {
          color: #2563eb !important;
        }

        .dashboard-theme-light .settings-page h1,
        .dashboard-theme-light .settings-page h2,
        .dashboard-theme-light .settings-page h3,
        .dashboard-theme-light .settings-page h4,
        .dashboard-theme-light .settings-page .text-white,
        .dashboard-theme-light .settings-page [class*="text-white"] {
          color: #111827 !important;
        }

        .dashboard-theme-light .settings-page [class*="text-[#64748B]"],
        .dashboard-theme-light .settings-page [class*="text-slate-500"],
        .dashboard-theme-light .settings-page [class*="text-slate-400"] {
          color: #52647a !important;
        }

        .dashboard-theme-light .settings-page [class*="bg-white/[0.025]"],
        .dashboard-theme-light .settings-page [class*="bg-white/[0.03]"],
        .dashboard-theme-light .settings-page [class*="bg-white/[0.045]"],
        .dashboard-theme-light .settings-page [class*="bg-white/[0.06]"],
        .dashboard-theme-light .settings-page [class*="bg-[#151925]"],
        .dashboard-theme-light .settings-page [class*="bg-[#0b101c]"],
        .dashboard-theme-light .settings-page [class*="bg-[#0d1323]"] {
          background-color: #ffffff !important;
        }

        .dashboard-theme-light .settings-page [class*="border-white/"],
        .dashboard-theme-light .settings-page [class*="border-white["] {
          border-color: #d5deea !important;
        }

        .dashboard-theme-light .settings-page input,
        .dashboard-theme-light .settings-page textarea,
        .dashboard-theme-light .settings-page select {
          background-color: #ffffff !important;
          border-color: #b9c6d8 !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .settings-page input::placeholder,
        .dashboard-theme-light .settings-page textarea::placeholder {
          color: #718096 !important;
        }

        .dashboard-theme-light .settings-page button:not([class*="bg-[#2F80FF]"]):not([class*="from-[#2F80FF]"]):not([class*="bg-gradient"]) {
          color: #334155 !important;
        }

        .dashboard-theme-light .settings-page button:hover:not([class*="bg-[#2F80FF]"]):not([class*="from-[#2F80FF]"]):not([class*="bg-gradient"]) {
          color: #111827 !important;
          background-color: #eef4ff !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-inactive,
        .dashboard-theme-light .settings-page .settings-user-nav-item-inactive {
          background-color: transparent !important;
          border-color: transparent !important;
          color: #475569 !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-inactive svg,
        .dashboard-theme-light .settings-page .settings-user-nav-item-inactive svg {
          color: #64748b !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-inactive:hover,
        .dashboard-theme-light .settings-page .settings-user-nav-item-inactive:hover {
          background-color: #eef4ff !important;
          color: #1d4ed8 !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-inactive:hover svg,
        .dashboard-theme-light .settings-page .settings-user-nav-item-inactive:hover svg {
          color: #2563eb !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-active,
        .dashboard-theme-light .settings-page .settings-user-nav-item-active {
          background-color: #eff6ff !important;
          border-color: #bfdbfe !important;
          color: #1d4ed8 !important;
          box-shadow: inset 3px 0 0 #2f80ff, 0 8px 18px rgba(37, 99, 235, 0.08) !important;
        }

        .dashboard-theme-light .settings-page .settings-admin-nav-item-active svg,
        .dashboard-theme-light .settings-page .settings-user-nav-item-active svg {
          color: #2563eb !important;
        }

        .dashboard-theme-light .settings-page .settings-user-workspace-banner {
          background: #ffffff !important;
          border-color: #d5deea !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06) !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-overlay {
          background-color: rgba(15, 23, 42, 0.34) !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-modal {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.22) !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-header,
        .dashboard-theme-light .settings-page .settings-announcement-footer {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-field {
          background-color: #ffffff !important;
          border-color: #b9c6d8 !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-field::placeholder {
          color: #718096 !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-close,
        .dashboard-theme-light .settings-page .settings-announcement-cancel {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .dashboard-theme-light .settings-page .settings-announcement-close:hover,
        .dashboard-theme-light .settings-page .settings-announcement-cancel:hover {
          background-color: #eef4ff !important;
          border-color: #93c5fd !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .settings-page .settings-theme-option-inactive {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .dashboard-theme-light .settings-page .settings-theme-option-inactive svg {
          color: #64748b !important;
        }

        .dashboard-theme-light .settings-page .settings-theme-option-inactive:hover {
          background-color: #eef4ff !important;
          border-color: #93c5fd !important;
          color: #1d4ed8 !important;
        }

        .dashboard-theme-light .settings-page .settings-theme-option-active {
          background-color: #eff6ff !important;
          border-color: #60a5fa !important;
          color: #1d4ed8 !important;
        }

        .dashboard-theme-light .settings-page .settings-theme-option-active svg {
          color: #2563eb !important;
        }

        .dashboard-theme-dark .settings-page .settings-admin-nav-item-inactive,
        .dashboard-theme-dark .settings-page .settings-user-nav-item-inactive {
          background-color: transparent !important;
          border-color: transparent !important;
          color: #64748b !important;
        }

        .dashboard-theme-dark .settings-page .settings-admin-nav-item-inactive svg,
        .dashboard-theme-dark .settings-page .settings-user-nav-item-inactive svg {
          color: #64748b !important;
        }

        .dashboard-theme-dark .settings-page .settings-admin-nav-item-inactive:hover,
        .dashboard-theme-dark .settings-page .settings-user-nav-item-inactive:hover {
          background-color: rgba(255, 255, 255, 0.03) !important;
          color: #94a3b8 !important;
        }

        .dashboard-theme-dark .settings-page .settings-admin-nav-item-active,
        .dashboard-theme-dark .settings-page .settings-user-nav-item-active {
          background-color: #0d1b35 !important;
          border-color: #1b3b73 !important;
          color: #ffffff !important;
        }

        .dashboard-theme-dark .settings-page .settings-admin-nav-item-active svg,
        .dashboard-theme-dark .settings-page .settings-user-nav-item-active svg {
          color: #2f80ff !important;
        }

        .dashboard-theme-dark .settings-page .settings-theme-option-inactive {
          background-color: rgba(255, 255, 255, 0.025) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: #94a3b8 !important;
        }

        .dashboard-theme-dark .settings-page .settings-theme-option-inactive svg {
          color: #64748b !important;
        }

        .dashboard-theme-dark .settings-page .settings-theme-option-inactive:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(47, 128, 255, 0.5) !important;
          color: #cbd5e1 !important;
        }

        .dashboard-theme-dark .settings-page .settings-theme-option-active {
          background-color: #0d1b35 !important;
          border-color: #2f80ff !important;
          color: #ffffff !important;
        }

        .dashboard-theme-dark .settings-page .settings-theme-option-active svg {
          color: #60a5fa !important;
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-full items-center justify-center bg-[#070B17]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
        </main>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}


// just commenting
