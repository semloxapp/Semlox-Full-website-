"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Bell, BrainCircuit, ChevronLeft, FileSearch, Gauge,
  LogOut, Menu, Moon, PanelLeft, PencilLine, Sun, Target, X,
} from "lucide-react";
import type { PlatformAdminIdentity } from "@/lib/admin/auth";
import { AdminAnalyticsFilterControl, AdminAnalyticsScopeProvider } from "./AdminAnalyticsFilters";

const navigation = [
  { href: "/admin", label: "AI Test Overview", icon: BarChart3 },
  { href: "/admin/field-intelligence", label: "Field Intelligence", icon: Target },
  { href: "/admin/corrections", label: "Human Corrections", icon: PencilLine },
  { href: "/admin/documents", label: "Document Audit", icon: FileSearch },
  { href: "/admin/performance", label: "Performance & Failures", icon: Gauge },
] as const;

function routeTitle(pathname: string) {
  return navigation.find((item) => item.href === pathname)?.label ?? "SemloX Admin";
}

export function AdminShell({ admin, children }: { admin: PlatformAdminIdentity; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("semlox-dashboard-theme");
    if (saved === "light" || saved === "dark") queueMicrotask(() => setTheme(saved));
  }, []);

  function changeTheme(next: "light" | "dark") {
    setTheme(next);
    window.localStorage.setItem("semlox-dashboard-theme", next);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  const initials = admin.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`admin-shell admin-theme-${theme} ${collapsed ? "admin-sidebar-collapsed" : ""}`}>
      {mobileOpen ? <button className="admin-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`admin-sidebar ${mobileOpen ? "admin-sidebar-mobile-open" : ""}`}>
        <div className="admin-brand"><div className="admin-brand-mark">S</div><div className="admin-sidebar-copy"><strong>Semlo<span>X</span></strong><small>Internal Analytics</small></div></div>
        <button className="admin-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={16} /></button>
        <nav className="admin-navigation" aria-label="Admin navigation">
          <div className="admin-nav-label">Testing & Evaluation</div>
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return <Link key={href} href={href} title={collapsed ? label : undefined} className={`admin-nav-item ${active ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={16} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="admin-sidebar-footer"><div className="admin-avatar">{initials}</div><div className="admin-sidebar-copy"><strong>{admin.name}</strong><small>Platform Administrator</small></div></div>
      </aside>

      <div className="admin-main"><AdminAnalyticsScopeProvider>
        <header className="admin-topbar">
          <button className="admin-icon-button admin-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={17} /></button>
          <button className="admin-icon-button admin-collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeft size={17} /> : <ChevronLeft size={17} />}</button>
          <div className="admin-topbar-heading"><strong>{routeTitle(pathname)}</strong><small>Internal platform analytics</small></div>
          <div className="admin-topbar-actions">
            <AdminAnalyticsFilterControl/>
            <span className="admin-role-badge"><BrainCircuit size={13} /> Platform Admin</span>
            <div className="admin-theme-toggle" aria-label="Theme">
              <button className={theme === "light" ? "active" : ""} onClick={() => changeTheme("light")} aria-label="Use light theme"><Sun size={13} /></button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => changeTheme("dark")} aria-label="Use dark theme"><Moon size={13} /></button>
            </div>
            <button className="admin-icon-button" aria-label="Notifications"><Bell size={16} /><i className="admin-notification-dot" /></button>
            <div className="admin-profile-wrap">
              <button className="admin-avatar" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Open admin profile">{initials}</button>
              {profileOpen ? <div className="admin-profile-menu"><strong>{admin.name}</strong><span>{admin.email}</span><small>Platform Administrator</small><button onClick={signOut}><LogOut size={14} /> Sign out</button></div> : null}
            </div>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </AdminAnalyticsScopeProvider></div>
    </div>
  );
}
