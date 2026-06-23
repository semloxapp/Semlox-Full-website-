"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FilePenLine,
  FileText,
  RefreshCw,
  Sparkles,
  Upload,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCompany } from "../context/CompanyContext";
import { fetchMemberships } from "../utils/authClient";
import {
  DashboardLineChart,
  DashboardStatusDonut,
  TeamActivityBarChart,
} from "./components/DashboardCharts";

type Scope = "user" | "company";
type Range = "7d" | "30d" | "90d";
type DashboardDocument = {
  documentId: string;
  awbNumber: string;
  fileName: string;
  processedBy: string;
  status: string;
  fields: { total: number; captured: number; warnings: number; corrected: number };
  updatedAt: string;
};
type Activity = {
  id: string;
  documentId: string | null;
  type: string;
  title: string;
  message: string | null;
  createdAt: string;
  user: string;
};
type TeamRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  uploaded: number;
  drafts: number;
  issued: number;
  failed: number;
  fieldsCorrected: number;
  lastActive: string | null;
};
type DashboardData = {
  scope: Scope;
  range: Range;
  role: string;
  canViewCompanyDashboard?: boolean;
  stats: Record<string, number>;
  trend: Array<Record<string, string | number>>;
  statusSplit: Array<{ name: string; value: number; color: string }>;
  pendingWork?: DashboardDocument[];
  recentActivity?: Activity[];
  teamActivity?: TeamRow[];
  activeDocuments?: DashboardDocument[];
  exceptions?: DashboardDocument[];
};

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

function formatDuration(milliseconds: number) {
  if (!milliseconds) return "0s";
  return milliseconds < 1000
    ? `${milliseconds}ms`
    : `${(milliseconds / 1000).toFixed(1)}s`;
}

function percentage(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

function statusClass(status: string) {
  if (status === "issued" || status === "ready_to_issue") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
  }
  if (status === "failed") return "border-red-400/25 bg-red-400/10 text-red-300";
  if (status === "draft") return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  return "border-orange-400/25 bg-orange-400/10 text-orange-300";
}

function DashboardCard({
  label,
  value,
  detail,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  color: string;
  icon: ReactNode;
}) {
  return (
    <div className="dashboard-card relative overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.025] p-4">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${color}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">{label}</div>
          <div className="mt-2 font-mono text-[25px] font-bold text-white">{value}</div>
          <div className="mt-1 text-[9px] text-[#64748b]">{detail}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-white/[0.04] text-[#60a5fa]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="dashboard-panel overflow-hidden rounded-[10px] border border-white/[0.08] bg-white/[0.025]">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="text-[12px] font-extrabold text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[9px] text-[#64748b]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DocumentsTable({
  documents,
  company,
}: {
  documents: DashboardDocument[];
  company: boolean;
}) {
  if (!documents.length) {
    return <EmptyState message="No pending AWB work." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="text-left text-[8px] uppercase tracking-[0.08em] text-[#64748b]">
            {["AWB Number", "File Name", ...(company ? ["Processed By"] : []), "Status", "Fields", "Updated", "Action"].map((label) => (
              <th key={label} className="border-b border-white/[0.08] px-4 py-2.5 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.documentId} className="hover:bg-white/[0.025]">
              <td className="border-b border-white/[0.05] px-4 py-3 font-mono text-[10px] font-bold text-white">{document.awbNumber}</td>
              <td className="border-b border-white/[0.05] px-4 py-3 text-[10px] text-[#cbd5e1]">{document.fileName}</td>
              {company ? <td className="border-b border-white/[0.05] px-4 py-3 text-[10px] text-[#cbd5e1]">{document.processedBy}</td> : null}
              <td className="border-b border-white/[0.05] px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[8px] font-bold ${statusClass(document.status)}`}>{document.status.replaceAll("_", " ")}</span></td>
              <td className="border-b border-white/[0.05] px-4 py-3 font-mono text-[9px] text-[#94a3b8]">{document.fields.captured}/{document.fields.total}</td>
              <td className="border-b border-white/[0.05] px-4 py-3 text-[9px] text-[#64748b]">{formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</td>
              <td className="border-b border-white/[0.05] px-4 py-3">
                <Link href={`/dashboard/awb?documentId=${document.documentId}`} className="rounded-[6px] border border-blue-400/25 bg-blue-400/10 px-2.5 py-1.5 text-[9px] font-bold text-blue-300">
                  {document.status === "draft" ? "Open Draft" : "Continue Review"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-[11px] text-[#64748b]">
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isHydrated, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const selectedCompanyIdRef = useRef(selectedCompanyId);
  const [allowed, setAllowed] = useState(false);
  const [initializationError, setInitializationError] = useState("");
  const [scope, setScope] = useState<Scope>("user");
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    selectedCompanyIdRef.current = selectedCompanyId;
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!isHydrated) return;
    let mounted = true;
    void fetchMemberships().then((result) => {
      if (!mounted) return;
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) router.replace("/login");
        else {
          setInitializationError("Unable to load your company memberships.");
          setLoading(false);
        }
        return;
      }
      const accepted = (result.memberships || []).filter(
        (membership: { accepted_at?: string | null }) => membership.accepted_at
      );
      if (!accepted.length) {
        setInitializationError("No active company membership was found for this account.");
        setLoading(false);
        return;
      }
      const currentCompanyId = selectedCompanyIdRef.current;
      const currentCompanyIsValid = accepted.some(
        (membership: { company_id: string }) => membership.company_id === currentCompanyId
      );
      if (!currentCompanyIsValid) {
        setSelectedCompanyId(accepted[0].company_id, true);
      }
      setInitializationError("");
      setAllowed(true);
    });
    return () => {
      mounted = false;
    };
  }, [isHydrated, router, setSelectedCompanyId]);

  useEffect(() => {
    if (!allowed || !selectedCompanyId) return;
    const companyId = selectedCompanyId;
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const response = await fetch(
          `/api/dashboard/${scope}?companyId=${encodeURIComponent(companyId)}&range=${range}`,
          { credentials: "include", signal: controller.signal }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(responseMessage(payload, "Unable to load dashboard."));
        }
        if (!controller.signal.aborted) {
          setData(payload.data as DashboardData);
          setError("");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchDashboard();
    return () => controller.abort();
  }, [allowed, range, refreshKey, scope, selectedCompanyId]);

  function beginReload() {
    setLoading(true);
    setError("");
  }

  if ((!isHydrated || !allowed || loading) && !initializationError) {
    return (
      <main className="flex h-full items-center justify-center bg-[#04060f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2f80ff]" />
      </main>
    );
  }

  if (initializationError || error || !data) {
    return (
      <main className="flex h-full items-center justify-center bg-[#04060f] px-4 text-center">
        <div>
          <div className="text-[13px] font-semibold text-red-300">{initializationError || error || "No dashboard data yet."}</div>
          {!initializationError ? <button type="button" onClick={() => { beginReload(); setRefreshKey((value) => value + 1); }} className="mt-4 rounded-[7px] bg-[#2f80ff] px-4 py-2 text-[11px] font-bold text-white">Retry</button> : null}
        </div>
      </main>
    );
  }

  const company = data.scope === "company";
  const stats = data.stats;
  const documents = company ? data.activeDocuments || [] : data.pendingWork || [];
  const topCards = [
    {
      label: company ? "Company AWBs" : "My AWBs Today",
      value: company ? stats.companyAwbs || 0 : stats.myAwbsToday || 0,
      detail: company ? `Last ${range.replace("d", " days")}` : "Uploaded today",
      color: "bg-gradient-to-r from-blue-500 to-cyan-500",
      icon: <FileText className="h-4 w-4" />,
    },
    { label: "Needs Review", value: stats.needsReview || 0, detail: "Review required + drafts", color: "bg-gradient-to-r from-orange-500 to-amber-500", icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Drafts", value: stats.drafts || 0, detail: "Pending completion", color: "bg-gradient-to-r from-amber-500 to-yellow-400", icon: <FilePenLine className="h-4 w-4" /> },
    { label: "Issued AWBs", value: stats.issued || 0, detail: "Completed documents", color: "bg-gradient-to-r from-emerald-500 to-cyan-500", icon: <FileCheck2 className="h-4 w-4" /> },
  ];
  const secondaryCards = [
    { label: "Failed", value: stats.failed || 0, detail: "Processing failures", color: "bg-gradient-to-r from-red-500 to-orange-500", icon: <XCircle className="h-4 w-4" /> },
    { label: "Avg Processing Time", value: formatDuration(stats.avgProcessingTimeMs || 0), detail: "Completed extraction average", color: "bg-gradient-to-r from-violet-500 to-blue-500", icon: <Clock3 className="h-4 w-4" /> },
    { label: "Avg AI Confidence", value: percentage(stats.avgConfidence || 0), detail: "Model confidence, not accuracy", color: "bg-gradient-to-r from-cyan-500 to-blue-500", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Fields Corrected", value: stats.fieldsCorrected || 0, detail: `${percentage(stats.correctionRate || 0)} correction rate`, color: "bg-gradient-to-r from-fuchsia-500 to-violet-500", icon: <WandSparkles className="h-4 w-4" /> },
  ];

  return (
    <main className="dashboard-real h-full overflow-y-auto bg-[#04060f] px-5 py-4 text-white">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold">{company ? "Company AWB Overview" : "My AWB Overview"}</h1>
            <p className="mt-1 text-[11px] text-[#64748b]">{company ? "Company-wide AWB processing performance and team workload" : "What needs your attention and what you completed"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.canViewCompanyDashboard || company ? (
              <div className="inline-flex rounded-[7px] border border-white/[0.08] bg-white/[0.025] p-1">
                <button type="button" onClick={() => { if (scope !== "user") { beginReload(); setScope("user"); } }} className={`h-7 rounded-[5px] px-3 text-[10px] font-bold ${scope === "user" ? "bg-[#2f80ff] text-white" : "text-[#64748b]"}`}>My Overview</button>
                <button type="button" onClick={() => { if (scope !== "company") { beginReload(); setScope("company"); } }} className={`h-7 rounded-[5px] px-3 text-[10px] font-bold ${scope === "company" ? "bg-[#2f80ff] text-white" : "text-[#64748b]"}`}>Company Overview</button>
              </div>
            ) : null}
            <select value={range} onChange={(event) => { beginReload(); setRange(event.target.value as Range); }} className="h-9 rounded-[7px] border border-white/10 bg-[#0b1220] px-3 text-[10px] text-[#cbd5e1]">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button type="button" onClick={() => { beginReload(); setRefreshKey((value) => value + 1); }} className="flex h-9 items-center gap-2 rounded-[7px] border border-white/10 px-3 text-[10px] text-[#94a3b8]"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
            <Link href="/dashboard/awb" className="flex h-9 items-center gap-2 rounded-[7px] bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] px-4 text-[10px] font-bold text-white"><Upload className="h-3.5 w-3.5" />Upload New AWB</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{topCards.map((card) => <DashboardCard key={card.label} {...card} />)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{secondaryCards.map((card) => <DashboardCard key={card.label} {...card} />)}</div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <Panel title={company ? "Company Processing Trend" : "My AWB Processing Trend"} subtitle={`Real document activity over the last ${range.replace("d", " days")}`}><div className="p-3"><DashboardLineChart data={data.trend} /></div></Panel>
          <Panel title={company ? "Company Status Split" : "My Status Split"} subtitle="Current document status distribution"><div className="p-3"><DashboardStatusDonut data={data.statusSplit} /></div></Panel>
        </div>

        {company ? (
          <>
            <Panel title="Team Activity" subtitle="Uploaded, issued, and draft AWBs by user"><div className="p-3"><TeamActivityBarChart data={(data.teamActivity || []) as unknown as Array<Record<string, string | number | null>>} /></div></Panel>
            <Panel title="Team Activity Details" subtitle="Real company processing totals by accepted member">
              {!data.teamActivity?.length ? <EmptyState message="No team activity yet." /> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[860px] border-collapse"><thead><tr className="text-left text-[8px] uppercase text-[#64748b]">{["User","Role","Uploaded","Issued","Drafts","Failed","Fields Corrected","Last Active"].map((label)=><th key={label} className="border-b border-white/[0.08] px-4 py-2.5">{label}</th>)}</tr></thead><tbody>{data.teamActivity.map((row)=><tr key={row.userId} className="hover:bg-white/[0.025]"><td className="border-b border-white/[0.05] px-4 py-3"><div className="text-[10px] font-bold text-white">{row.name}</div><div className="text-[8px] text-[#64748b]">{row.email}</div></td><td className="border-b border-white/[0.05] px-4 py-3 text-[10px] text-[#94a3b8]">{row.role}</td>{[row.uploaded,row.issued,row.drafts,row.failed,row.fieldsCorrected].map((value,index)=><td key={index} className="border-b border-white/[0.05] px-4 py-3 font-mono text-[10px] text-[#cbd5e1]">{value}</td>)}<td className="border-b border-white/[0.05] px-4 py-3 text-[9px] text-[#64748b]">{row.lastActive ? formatDistanceToNow(new Date(row.lastActive), { addSuffix: true }) : "No activity"}</td></tr>)}</tbody></table></div>
              )}
            </Panel>
          </>
        ) : null}

        <Panel title={company ? "Active AWB Documents" : "Pending Work"} subtitle={company ? "Company documents requiring attention" : "Drafts and reviews waiting for you"}><DocumentsTable documents={documents} company={company} /></Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title={company ? "Recent Exceptions" : "Recent Activity"} subtitle={company ? "Failures and documents with elevated review needs" : "Your latest AWB actions"}>
            {company ? (
              !data.exceptions?.length ? <EmptyState message="No recent exceptions." /> : <div className="divide-y divide-white/[0.06]">{data.exceptions.map((item)=><Link key={item.documentId} href={`/dashboard/awb?documentId=${item.documentId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025]"><AlertTriangle className="h-4 w-4 text-amber-300" /><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-bold text-white">{item.awbNumber}</div><div className="mt-0.5 truncate text-[9px] text-[#64748b]">{item.fileName} / {item.status.replaceAll("_"," ")}</div></div><span className="font-mono text-[9px] text-[#94a3b8]">{item.fields.warnings} flagged</span></Link>)}</div>
            ) : (
              !data.recentActivity?.length ? <EmptyState message="No recent activity yet." /> : <div className="divide-y divide-white/[0.06]">{data.recentActivity.map((item)=><div key={item.id} className="flex items-start gap-3 px-4 py-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /><div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-white">{item.title}</div><div className="mt-0.5 text-[9px] text-[#64748b]">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</div></div>{item.documentId ? <Link href={`/dashboard/awb?documentId=${item.documentId}`} className="text-[9px] font-bold text-blue-300">Open</Link> : null}</div>)}</div>
            )}
          </Panel>
          <Panel title="AI Quality Signal" subtitle="Confidence and human correction are measured separately">
            <div className="grid min-h-40 grid-cols-2 gap-3 p-4">
              <div className="rounded-[8px] border border-cyan-400/20 bg-cyan-400/[0.06] p-4"><div className="text-[9px] uppercase text-[#64748b]">Avg AI Confidence</div><div className="mt-2 font-mono text-[26px] font-bold text-cyan-300">{percentage(stats.avgConfidence || 0)}</div><p className="mt-2 text-[9px] leading-4 text-[#64748b]">The model&apos;s own confidence estimate.</p></div>
              <div className="rounded-[8px] border border-fuchsia-400/20 bg-fuchsia-400/[0.06] p-4"><div className="text-[9px] uppercase text-[#64748b]">Human Correction Rate</div><div className="mt-2 font-mono text-[26px] font-bold text-fuchsia-300">{percentage(stats.correctionRate || 0)}</div><p className="mt-2 text-[9px] leading-4 text-[#64748b]">Fields changed from the AI original value.</p></div>
            </div>
          </Panel>
        </div>
      </div>
      <style jsx global>{`
        .dashboard-theme-light .dashboard-real { background: #f3f4f6 !important; color: #111827 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-card,
        .dashboard-theme-light .dashboard-real .dashboard-panel { background: #ffffff !important; border-color: #d9e0ea !important; }
        .dashboard-theme-light .dashboard-real [class*="text-white"] { color: #111827 !important; }
        .dashboard-theme-light .dashboard-real [class*="border-white"] { border-color: #d9e0ea !important; }
        .dashboard-theme-light .dashboard-real select { background: #ffffff !important; color: #334155 !important; border-color: #cbd5e1 !important; }
      `}</style>
    </main>
  );
}
