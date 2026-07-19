"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarRange, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { getAdminAnalyticsFilterOptions } from "@/lib/admin/client";
import type { AdminAnalyticsFilterOptions, AdminAnalyticsScope } from "@/lib/admin/types";

const emptyScope: AdminAnalyticsScope = { dateFrom: null, dateTo: null, companyId: null, userId: null };
const ScopeContext = createContext<{ scope: AdminAnalyticsScope; query: string; setScope: (scope: AdminAnalyticsScope) => void }>({ scope: emptyScope, query: "", setScope: () => undefined });
const toIso = (value: string) => value ? new Date(value).toISOString() : null;

export function useAdminAnalyticsScope() {
  return useContext(ScopeContext);
}

export function AdminAnalyticsScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<AdminAnalyticsScope>(emptyScope);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (scope.dateFrom) params.set("dateFrom", scope.dateFrom);
    if (scope.dateTo) params.set("dateTo", scope.dateTo);
    if (scope.companyId) params.set("companyId", scope.companyId);
    if (scope.userId) params.set("userId", scope.userId);
    return params.toString();
  }, [scope]);
  return <ScopeContext.Provider value={{ scope, query, setScope }}>{children}</ScopeContext.Provider>;
}

export function AdminAnalyticsFilterControl() {
  const { scope, setScope: onApply } = useAdminAnalyticsScope();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AdminAnalyticsFilterOptions>({ companies: [], users: [] });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getAdminAnalyticsFilterOptions(controller.signal).then(setOptions).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const users = companyId ? options.users.filter((user) => user.companyIds.includes(companyId)) : options.users;
  const activeCount = [scope.dateFrom || scope.dateTo, scope.companyId, scope.userId].filter(Boolean).length;
  function reset() {
    setDateFrom(""); setDateTo(""); setCompanyId(""); setUserId("");
    onApply(emptyScope); setOpen(false);
  }
  function apply() {
    const next = { dateFrom: toIso(dateFrom), dateTo: toIso(dateTo), companyId: companyId || null, userId: userId || null };
    if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) return;
    onApply(next); setOpen(false);
  }
  return <div className="admin-global-filter">
    <button className={`admin-global-filter-trigger ${activeCount ? "active" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open analytics filters">
      <SlidersHorizontal size={14}/><span>Filters</span>{activeCount ? <b>{activeCount}</b> : null}
    </button>
    {open ? <div className="admin-global-filter-popover" role="dialog" aria-label="Analytics filters">
      <header><div><strong>Analytics scope</strong><small>Filter by document creation time and ownership</small></div><button onClick={() => setOpen(false)} aria-label="Close filters"><X size={15}/></button></header>
      <div className="admin-global-filter-grid">
        <label><span><CalendarRange size={12}/>From</span><input type="datetime-local" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/></label>
        <label><span><CalendarRange size={12}/>To</span><input type="datetime-local" value={dateTo} onChange={(event) => setDateTo(event.target.value)}/></label>
        <label><span>Company</span><select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setUserId(""); }}><option value="">All companies</option>{options.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <label><span>Uploaded by</span><select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">All users</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}{user.email ? ` · ${user.email}` : ""}</option>)}</select></label>
      </div>
      {dateFrom && dateTo && toIso(dateFrom)! > toIso(dateTo)! ? <p className="admin-global-filter-error">From must be earlier than To.</p> : null}
      <footer><button className="admin-button" onClick={reset}><RotateCcw size={12}/>Reset</button><button className="admin-button admin-button-primary" onClick={apply}>Apply filters</button></footer>
    </div> : null}
  </div>;
}
