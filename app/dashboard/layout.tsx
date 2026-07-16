"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  Filter,
  Home,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from "lucide-react";
import NotificationBell from "./components/notifications/NotificationBell";
import UserAccountMenu from "./components/UserAccountMenu";
import DashboardMembershipBootstrap from "./components/DashboardMembershipBootstrap";

function navClass(active: boolean) {
  return `dashboard-nav-item ${active ? "dashboard-nav-active" : "dashboard-nav-inactive"} flex h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[12.5px] ${
    active
      ? "border border-[#1B3B73] bg-[#0D1B35] font-bold text-white shadow-[inset_3px_0_0_#2F80FF]"
      : "font-medium text-[#6F86AA] hover:bg-white/[0.03]"
  }`;
}

function AppHeader({
  theme,
  onThemeChange,
  sidebarCollapsed,
}: {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  sidebarCollapsed: boolean;
}) {
  const pathname = usePathname();
  const title =
    pathname === "/dashboard/awb"
      ? "AWB Processing"
      : pathname === "/dashboard/history"
        ? "History"
        : pathname === "/dashboard/settings"
          ? "Settings"
          : "Overview";

  return (
    <div className="dashboard-header fixed left-0 right-0 top-0 z-[200] flex h-[50px] items-center justify-between border-b border-white/[0.08] bg-[#070B17] pr-5 text-white">
      <div className="flex h-full items-center">
        <div
          className={`dashboard-header-brand flex h-full items-center gap-2 border-r border-white/[0.06] transition-[width,padding] duration-200 ${
            sidebarCollapsed ? "w-[64px] justify-center px-2" : "w-[220px] px-5"
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2F80FF]">
            <span className="text-[12px] font-bold text-white">S</span>
          </div>
          <div className={`leading-none ${sidebarCollapsed ? "hidden" : ""}`}>
            <h1 className="dashboard-header-title text-[13.5px] font-bold">SemloX</h1>
            <p className="dashboard-header-subtitle mt-1 text-[9px] tracking-[0.1em] text-[#64748B]">
              AI DOCUMENT ENGINE
            </p>
          </div>
        </div>
        <div className="px-7 leading-none">
          <h2 className="dashboard-header-title mb-1 text-[13px] font-semibold text-white">{title}</h2>
          <p className="dashboard-header-subtitle text-[9px] text-[#64748B]">DB Schenker Logistics</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="dashboard-theme-switch flex h-8 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
          <button
            type="button"
            onClick={() => onThemeChange("light")}
            className={`dashboard-theme-option flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-semibold transition ${theme === "light" ? "dashboard-theme-option-active bg-[#2F80FF] text-white" : "text-[#64748B] hover:text-white"}`}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => onThemeChange("dark")}
            className={`dashboard-theme-option flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-semibold transition ${theme === "dark" ? "dashboard-theme-option-active bg-[#2F80FF] text-white" : "text-[#64748B] hover:text-white"}`}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
        <button className="dashboard-header-action flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Filter className="h-4 w-4 text-[#64748B]" />
        </button>
        <NotificationBell theme={theme} />
        <UserAccountMenu theme={theme} />
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const labelClass = collapsed ? "sr-only" : "";
  const itemClass = collapsed ? "justify-center px-0" : "";

  return (
    <aside
      className={`dashboard-sidebar flex h-full min-h-0 shrink-0 flex-col border-r border-white/[0.06] bg-[#070B17] px-2 py-3 text-white transition-[width] duration-200 ${
        collapsed ? "w-[64px]" : "w-[220px]"
      }`}
    >
      <div className={`mb-2 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
        <div className={`dashboard-sidebar-label text-[9px] font-semibold uppercase tracking-[0.18em] text-[#334155] ${collapsed ? "sr-only" : ""}`}>
          Menu
        </div>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Open navigation" : "Close navigation"}
          aria-label={collapsed ? "Open navigation" : "Close navigation"}
          aria-pressed={collapsed}
          className="dashboard-sidebar-toggle flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/[0.08] bg-white/[0.02] text-[#6f86aa] transition hover:bg-white/[0.05] hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      <nav className="space-y-1">
        <Link href="/dashboard" title="Overview" className={`${navClass(pathname === "/dashboard")} ${itemClass}`}>
          <Home className="h-4 w-4" />
          <span className={labelClass}>Overview</span>
        </Link>
        <Link href="/dashboard/awb" title="AWB Processing" className={`${navClass(pathname === "/dashboard/awb")} ${collapsed ? "justify-center px-0" : "justify-between"}`}>
          <span className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <FileText className="h-4 w-4" />
            <span className={labelClass}>AWB Processing</span>
          </span>
          <span className={`h-[17px] w-[17px] items-center justify-center rounded-full bg-[#123D8A] text-[9px] font-bold text-[#4F8BFF] ${collapsed ? "hidden" : "flex"}`}>
            3
          </span>
        </Link>
        <Link href="/dashboard/history" title="History" className={`${navClass(pathname === "/dashboard/history")} ${itemClass}`}>
          <Activity className="h-4 w-4" />
          <span className={labelClass}>History</span>
        </Link>
        <Link href="/dashboard/settings" title="Settings" className={`${navClass(pathname === "/dashboard/settings")} ${itemClass}`}>
          <Settings className="h-4 w-4" />
          <span className={labelClass}>Settings</span>
        </Link>
      </nav>

      <div className={`dashboard-sidebar-divider mt-3 border-t border-white/[0.06] pt-2 ${collapsed ? "hidden" : ""}`}>
        <div className="dashboard-plan-card rounded-[7px] border border-[#17325F] bg-[#0A1530] p-3">
          <h3 className="dashboard-plan-title text-[11.5px] font-bold text-white">Enterprise Plan</h3>
          <p className="dashboard-plan-copy mt-1 text-[9.5px] text-[#7D8EA8]">10,000 AWBs/month</p>
          <div className="dashboard-plan-track mt-2 h-[3px] w-full rounded-full bg-[#132746]">
            <div className="h-full w-[48%] rounded-full bg-[#00D9FF]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px]">
            <span className="text-[#2F80FF]">4,823 used</span>
            <span className="dashboard-plan-copy text-[#64748B]">5,177 left</span>
          </div>
        </div>
      </div>

      <div className={`dashboard-sidebar-divider mt-4 border-t border-white/[0.06] pt-3 ${collapsed ? "hidden" : ""}`}>
        <div className="dashboard-sidebar-label mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
          Support
        </div>
        <a className="dashboard-support-link flex h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[12.5px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <FileText className="h-4 w-4" />
          Documentation
        </a>
      </div>

      <Link href="/logout" title="Logout" className={`dashboard-support-link mt-auto mb-3 flex h-[34px] items-center gap-2.5 rounded-[6px] text-[12.5px] font-medium text-[#6F86AA] hover:bg-white/[0.03] ${collapsed ? "justify-center px-0" : "px-3"}`}>
        <LogOut className="h-4 w-4" />
        <span className={labelClass}>Logout</span>
      </Link>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [awbSidebarOpen, setAwbSidebarOpen] = useState(false);
  const [defaultSidebarCollapsed, setDefaultSidebarCollapsed] = useState(false);
  const isAwbRoute = pathname === "/dashboard/awb";
  const sidebarCollapsed = isAwbRoute ? !awbSidebarOpen : defaultSidebarCollapsed;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("semlox-dashboard-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      queueMicrotask(() => setTheme(savedTheme));
    }
  }, []);

  const updateTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    window.localStorage.setItem("semlox-dashboard-theme", nextTheme);
  };

  const toggleSidebar = () => {
    if (isAwbRoute) {
      setAwbSidebarOpen((current) => !current);
      return;
    }
    setDefaultSidebarCollapsed((current) => !current);
  };

  return (
    <div className={`dashboard-shell dashboard-theme-${theme} flex h-screen flex-col bg-[#050813]`}>
      <DashboardMembershipBootstrap />
      <AppHeader theme={theme} onThemeChange={updateTheme} sidebarCollapsed={sidebarCollapsed} />
      <div className="mt-[50px] flex h-[calc(100vh-50px)] overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <main className="dashboard-content min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
      <style jsx global>{`
        .dashboard-shell {
          --theme-accent: #2f80ff;
          --theme-accent-hover: #256fe0;
          --theme-danger: #dc2626;
          background: var(--theme-page);
          color: var(--theme-text);
          transition: background-color 160ms ease, color 160ms ease;
        }

        .dashboard-shell.dashboard-theme-light {
          --theme-page: #f4f7fb;
          --theme-surface: #ffffff;
          --theme-surface-subtle: #f8fafc;
          --theme-surface-elevated: #ffffff;
          --theme-input: #ffffff;
          --theme-border: #d5deea;
          --theme-border-strong: #b9c6d8;
          --theme-text: #0f172a;
          --theme-text-secondary: #334155;
          --theme-muted: #52647a;
          --theme-faint: #718096;
          --theme-hover: #edf4ff;
          --theme-selected: #e6f0ff;
          --theme-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
          color-scheme: light;
        }

        .dashboard-shell.dashboard-theme-dark {
          --theme-page: #080b14;
          --theme-surface: #0f1523;
          --theme-surface-subtle: #121a2a;
          --theme-surface-elevated: #172033;
          --theme-input: #111827;
          --theme-border: rgba(148, 163, 184, 0.18);
          --theme-border-strong: rgba(148, 163, 184, 0.3);
          --theme-text: #f1f5f9;
          --theme-text-secondary: #cbd5e1;
          --theme-muted: #9aa9bd;
          --theme-faint: #718096;
          --theme-hover: rgba(148, 163, 184, 0.1);
          --theme-selected: rgba(47, 128, 255, 0.15);
          --theme-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
          color-scheme: dark;
        }

        .dashboard-header,
        .dashboard-sidebar {
          background: #070b17;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #f8fafc;
        }

        .dashboard-header-brand,
        .dashboard-sidebar-divider {
          border-color: rgba(255, 255, 255, 0.07) !important;
        }

        .dashboard-header-title,
        .dashboard-plan-title {
          color: #f8fafc !important;
        }

        .dashboard-header-subtitle,
        .dashboard-plan-copy {
          color: #8291a8 !important;
        }

        .dashboard-sidebar-label {
          color: #52647a !important;
        }

        .dashboard-nav-item,
        .dashboard-support-link {
          color: #8193af !important;
          transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
        }

        .dashboard-nav-inactive:hover,
        .dashboard-support-link:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #f1f5f9 !important;
        }

        .dashboard-nav-active {
          border-color: #1b3b73 !important;
          background: #0d1b35 !important;
          color: #ffffff !important;
        }

        .dashboard-plan-card {
          border-color: #17325f !important;
          background: #0a1530 !important;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .dashboard-plan-track {
          background: #132746 !important;
        }

        .dashboard-theme-switch,
        .dashboard-header-action {
          border-color: rgba(255, 255, 255, 0.1) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          color: #8291a8;
        }

        .dashboard-theme-option:not(.dashboard-theme-option-active):hover,
        .dashboard-header-action:hover {
          background: rgba(255, 255, 255, 0.07) !important;
          color: #ffffff !important;
        }

        .dashboard-theme-option:not(.dashboard-theme-option-active),
        .dashboard-header-action svg {
          color: #8291a8 !important;
        }

        .dashboard-content {
          background: var(--theme-page);
          color: var(--theme-text);
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .bg-page,
        .dashboard-shell.dashboard-theme-dark .dashboard-content main.bg-page {
          background-color: var(--theme-page) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .bg-surface {
          background-color: var(--theme-surface) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .border-borderx {
          border-color: var(--theme-border) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .text-textx {
          color: var(--theme-text) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .text-text2 {
          color: var(--theme-text-secondary) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .text-muted {
          color: var(--theme-muted) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .text-faint {
          color: var(--theme-faint) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content th,
        .dashboard-shell.dashboard-theme-dark .dashboard-content .bg-\\[\\#FAFAFA\\] {
          background-color: var(--theme-surface-subtle) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .border-\\[\\#F3F4F6\\] {
          border-color: var(--theme-border) !important;
        }

        .dashboard-shell.dashboard-theme-dark .dashboard-content .hover\\:bg-\\[\\#FAFAFA\\]:hover {
          background-color: var(--theme-hover) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content .bg-page,
        .dashboard-shell.dashboard-theme-light .dashboard-content main.bg-page,
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#04060f]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#050813]"] {
          background-color: var(--theme-page) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content .bg-surface,
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#0d1323]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#0a0e1a]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#111726]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#171d2d]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-[#1b2232]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-white/[0.02]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-white/[0.03]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-white/[0.035]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-white/[0.04]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="bg-white/[0.05]"] {
          background-color: var(--theme-surface) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="border-white/"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="border-white["],
        .dashboard-shell.dashboard-theme-light .dashboard-content .border-borderx {
          border-color: var(--theme-border) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content .text-textx,
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-slate-100"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-slate-200"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-slate-300"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-[#f1f5f9]"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-[#e2e8f0]"] {
          color: var(--theme-text) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content .text-text2,
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-slate-400"] {
          color: var(--theme-text-secondary) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content .text-muted,
        .dashboard-shell.dashboard-theme-light .dashboard-content .text-faint,
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-slate-500"],
        .dashboard-shell.dashboard-theme-light .dashboard-content [class*="text-[#64748b]"] {
          color: var(--theme-muted) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content table th,
        .dashboard-shell.dashboard-theme-light .dashboard-content .bg-\\[\\#FAFAFA\\] {
          background-color: var(--theme-surface-subtle) !important;
          color: var(--theme-muted) !important;
        }

        .dashboard-shell.dashboard-theme-light .dashboard-content table td,
        .dashboard-shell.dashboard-theme-light .dashboard-content .border-\\[\\#F3F4F6\\] {
          border-color: var(--theme-border) !important;
        }

        .dashboard-content input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
        .dashboard-content textarea,
        .dashboard-content select {
          border-color: var(--theme-border-strong) !important;
          background-color: var(--theme-input);
          color: var(--theme-text);
          transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
        }

        .dashboard-content input::placeholder,
        .dashboard-content textarea::placeholder {
          color: var(--theme-faint) !important;
          opacity: 1;
        }

        .dashboard-content input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):focus,
        .dashboard-content textarea:focus,
        .dashboard-content select:focus {
          border-color: var(--theme-accent) !important;
          box-shadow: 0 0 0 3px rgba(47, 128, 255, 0.14);
          outline: none;
        }

        .dashboard-content .action-btn,
        .dashboard-content .tab-pill,
        .dashboard-content .icon-btn {
          border-color: var(--theme-border-strong) !important;
          color: var(--theme-text-secondary) !important;
          background: var(--theme-surface-elevated) !important;
        }

        .dashboard-content .action-btn:hover,
        .dashboard-content .tab-pill:hover,
        .dashboard-content .icon-btn:hover,
        .dashboard-content .alert-feed-row:hover,
        .dashboard-content tbody tr:hover {
          background-color: var(--theme-hover) !important;
        }

        .dashboard-content [role="dialog"],
        .dashboard-content .dashboard-card,
        .dashboard-content .dashboard-panel {
          box-shadow: var(--theme-shadow);
        }

        .dashboard-content button,
        .dashboard-content a {
          transition-duration: 160ms;
          transition-timing-function: ease;
        }

        .dashboard-content button:disabled {
          cursor: not-allowed;
        }

        .dashboard-shell.dashboard-theme-light .awb-route-state,
        .dashboard-shell.dashboard-theme-light .awb-processing-view {
          background: #f4f7fb !important;
          color: #0f172a;
        }

        .dashboard-shell.dashboard-theme-dark .awb-route-state,
        .dashboard-shell.dashboard-theme-dark .awb-processing-view {
          background: radial-gradient(circle at 35% 35%, rgba(59, 130, 246, 0.08), transparent 32%),
            linear-gradient(135deg, #121827 0%, #080b14 72%) !important;
          color: #f1f5f9;
        }

        .dashboard-theme-light .awb-processing-stepper,
        .dashboard-theme-light .awb-processing-card {
          border-color: #d5deea !important;
          background: #ffffff !important;
          color: #0f172a !important;
          box-shadow: 0 14px 38px rgba(15, 23, 42, 0.1);
        }

        .dashboard-theme-dark .awb-processing-stepper {
          border-color: rgba(148, 163, 184, 0.18) !important;
          background: #0f1523 !important;
        }

        .dashboard-theme-dark .awb-processing-card {
          border-color: rgba(148, 163, 184, 0.2) !important;
          background: #121a2a !important;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.36);
        }

        .dashboard-theme-light .awb-processing-title {
          color: #0f172a !important;
        }

        .dashboard-theme-light .awb-processing-copy,
        .dashboard-theme-light .awb-processing-muted {
          color: #52647a !important;
        }

        .dashboard-theme-light .awb-processing-spinner {
          border-color: #d5deea;
          border-top-color: #2f80ff;
        }

        .dashboard-theme-light .awb-processing-progress {
          background: #dbe4f0 !important;
        }
      `}</style>
    </div>
  );
}
