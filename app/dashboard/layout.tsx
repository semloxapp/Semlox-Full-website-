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
  Settings,
  Sun,
} from "lucide-react";
import NotificationBell from "./components/notifications/NotificationBell";
import UserAccountMenu from "./components/UserAccountMenu";

function navClass(active: boolean) {
  return `flex h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[12.5px] ${
    active
      ? "border border-[#1B3B73] bg-[#0D1B35] font-bold text-white shadow-[inset_3px_0_0_#2F80FF]"
      : "font-medium text-[#6F86AA] hover:bg-white/[0.03]"
  }`;
}

function AppHeader({ theme, onThemeChange }: { theme: "light" | "dark"; onThemeChange: (theme: "light" | "dark") => void }) {
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
    <div className="fixed left-0 right-0 top-0 z-[200] flex h-[50px] items-center justify-between border-b border-white/[0.08] bg-[#070B17] pr-5 text-white">
      <div className="flex h-full items-center">
        <div className="flex h-full w-[220px] items-center gap-2 border-r border-white/[0.06] px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2F80FF]">
            <span className="text-[12px] font-bold text-white">S</span>
          </div>
          <div className="leading-none">
            <h1 className="text-[13.5px] font-bold">SemloX</h1>
            <p className="mt-1 text-[9px] tracking-[0.1em] text-[#64748B]">
              AI DOCUMENT ENGINE
            </p>
          </div>
        </div>
        <div className="px-7 leading-none">
          <h2 className="mb-1 text-[13px] font-semibold text-white">{title}</h2>
          <p className="text-[9px] text-[#64748B]">DB Schenker Logistics</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-8 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
          <button
            type="button"
            onClick={() => onThemeChange("light")}
            className={`flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-semibold transition ${theme === "light" ? "bg-[#2F80FF] text-white" : "text-[#64748B] hover:text-white"}`}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => onThemeChange("dark")}
            className={`flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-semibold transition ${theme === "dark" ? "bg-[#2F80FF] text-white" : "text-[#64748B] hover:text-white"}`}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Filter className="h-4 w-4 text-[#64748B]" />
        </button>
        <NotificationBell theme={theme} />
        <UserAccountMenu theme={theme} />
      </div>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#070B17] px-2 py-3 text-white">
      <div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
        Menu
      </div>

      <nav className="space-y-1">
        <Link href="/dashboard" className={navClass(pathname === "/dashboard")}>
          <Home className="h-4 w-4" />
          Overview
        </Link>
        <Link href="/dashboard/awb" className={`${navClass(pathname === "/dashboard/awb")} justify-between`}>
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            AWB Processing
          </span>
          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#123D8A] text-[9px] font-bold text-[#4F8BFF]">
            3
          </span>
        </Link>
        <Link href="/dashboard/history" className={navClass(pathname === "/dashboard/history")}>
          <Activity className="h-4 w-4" />
          History
        </Link>
        <Link href="/dashboard/settings" className={navClass(pathname === "/dashboard/settings")}>
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <div className="rounded-[7px] border border-[#17325F] bg-[#0A1530] p-3">
          <h3 className="text-[11.5px] font-bold text-white">Enterprise Plan</h3>
          <p className="mt-1 text-[9.5px] text-[#7D8EA8]">10,000 AWBs/month</p>
          <div className="mt-2 h-[3px] w-full rounded-full bg-[#132746]">
            <div className="h-full w-[48%] rounded-full bg-[#00D9FF]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px]">
            <span className="text-[#2F80FF]">4,823 used</span>
            <span className="text-[#64748B]">5,177 left</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
          Support
        </div>
        <a className="flex h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[12.5px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <FileText className="h-4 w-4" />
          Documentation
        </a>
      </div>

      <Link href="/logout" className="mt-auto mb-3 flex h-[34px] items-center gap-2.5 rounded-[6px] px-3 text-[12.5px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
        <LogOut className="h-4 w-4" />
        Logout
      </Link>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  return (
    <div className="flex h-screen flex-col bg-[#050813]">
      <AppHeader theme={theme} onThemeChange={updateTheme} />
      <div className="mt-[50px] flex h-[calc(100vh-50px)] overflow-hidden">
        <Sidebar />
        <main className={`dashboard-content dashboard-theme-${theme} min-w-0 flex-1 overflow-hidden`}>{children}</main>
      </div>
      <style jsx global>{`
        .dashboard-content.dashboard-theme-dark {
          background: #04060f;
          color: #f8fafc;
        }

        .dashboard-content.dashboard-theme-dark .bg-page,
        .dashboard-content.dashboard-theme-dark main.bg-page {
          background-color: #050813 !important;
        }

        .dashboard-content.dashboard-theme-dark .bg-surface {
          background-color: #0b1220 !important;
        }

        .dashboard-content.dashboard-theme-dark .border-borderx {
          border-color: rgba(148, 163, 184, 0.18) !important;
        }

        .dashboard-content.dashboard-theme-dark .text-textx {
          color: #f8fafc !important;
        }

        .dashboard-content.dashboard-theme-dark .text-text2 {
          color: #cbd5e1 !important;
        }

        .dashboard-content.dashboard-theme-dark .text-muted {
          color: #94a3b8 !important;
        }

        .dashboard-content.dashboard-theme-dark .text-faint {
          color: #64748b !important;
        }

        .dashboard-content.dashboard-theme-dark th,
        .dashboard-content.dashboard-theme-dark .bg-\\[\\#FAFAFA\\] {
          background-color: #111827 !important;
        }

        .dashboard-content.dashboard-theme-dark .border-\\[\\#F3F4F6\\] {
          border-color: rgba(148, 163, 184, 0.12) !important;
        }

        .dashboard-content.dashboard-theme-dark .hover\\:bg-\\[\\#FAFAFA\\]:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
        }

        .dashboard-content.dashboard-theme-light {
          background: #f3f4f6;
          color: #111827;
        }

        .dashboard-content.dashboard-theme-light .bg-page,
        .dashboard-content.dashboard-theme-light main.bg-page,
        .dashboard-content.dashboard-theme-light [class*="bg-[#04060f]"],
        .dashboard-content.dashboard-theme-light [class*="bg-[#050813]"] {
          background-color: #f3f4f6 !important;
        }

        .dashboard-content.dashboard-theme-light .bg-surface,
        .dashboard-content.dashboard-theme-light [class*="bg-[#0d1323]"],
        .dashboard-content.dashboard-theme-light [class*="bg-[#0a0e1a]"],
        .dashboard-content.dashboard-theme-light [class*="bg-[#111726]"],
        .dashboard-content.dashboard-theme-light [class*="bg-[#171d2d]"],
        .dashboard-content.dashboard-theme-light [class*="bg-[#1b2232]"],
        .dashboard-content.dashboard-theme-light [class*="bg-white/[0.02]"],
        .dashboard-content.dashboard-theme-light [class*="bg-white/[0.03]"],
        .dashboard-content.dashboard-theme-light [class*="bg-white/[0.035]"],
        .dashboard-content.dashboard-theme-light [class*="bg-white/[0.04]"],
        .dashboard-content.dashboard-theme-light [class*="bg-white/[0.05]"] {
          background-color: #f8fafc !important;
        }

        .dashboard-content.dashboard-theme-light [class*="border-white/"],
        .dashboard-content.dashboard-theme-light [class*="border-white["],
        .dashboard-content.dashboard-theme-light .border-borderx {
          border-color: #d9e0ea !important;
        }

        .dashboard-content.dashboard-theme-light .text-textx,
        .dashboard-content.dashboard-theme-light [class*="text-slate-100"],
        .dashboard-content.dashboard-theme-light [class*="text-slate-200"],
        .dashboard-content.dashboard-theme-light [class*="text-slate-300"],
        .dashboard-content.dashboard-theme-light [class*="text-[#f1f5f9]"],
        .dashboard-content.dashboard-theme-light [class*="text-[#e2e8f0]"] {
          color: #111827 !important;
        }

        .dashboard-content.dashboard-theme-light .text-text2,
        .dashboard-content.dashboard-theme-light [class*="text-slate-400"] {
          color: #334155 !important;
        }

        .dashboard-content.dashboard-theme-light .text-muted,
        .dashboard-content.dashboard-theme-light .text-faint,
        .dashboard-content.dashboard-theme-light [class*="text-slate-500"],
        .dashboard-content.dashboard-theme-light [class*="text-[#64748b]"] {
          color: #64748b !important;
        }

        .dashboard-content.dashboard-theme-light table th,
        .dashboard-content.dashboard-theme-light .bg-\\[\\#FAFAFA\\] {
          background-color: #f8fafc !important;
          color: #64748b !important;
        }

        .dashboard-content.dashboard-theme-light table td,
        .dashboard-content.dashboard-theme-light .border-\\[\\#F3F4F6\\] {
          border-color: #d9e0ea !important;
        }

        .dashboard-content.dashboard-theme-light .action-btn,
        .dashboard-content.dashboard-theme-light .tab-pill,
        .dashboard-content.dashboard-theme-light .icon-btn {
          border-color: #cbd5e1 !important;
          color: #334155 !important;
          background: #f8fafc !important;
        }

        .dashboard-content.dashboard-theme-light .action-btn:hover,
        .dashboard-content.dashboard-theme-light .tab-pill:hover,
        .dashboard-content.dashboard-theme-light .icon-btn:hover,
        .dashboard-content.dashboard-theme-light .alert-feed-row:hover,
        .dashboard-content.dashboard-theme-light tbody tr:hover {
          background-color: #eef4ff !important;
        }
      `}</style>
    </div>
  );
}
