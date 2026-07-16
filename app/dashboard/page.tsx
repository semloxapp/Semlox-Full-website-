"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
import {
  type DashboardData,
  type DashboardDocument,
  type DashboardRange as Range,
  type DashboardScope as Scope,
  useDashboardData,
} from "../hooks/queries/useDashboardData";
import { membershipErrorStatus, useMemberships } from "../hooks/queries/useMemberships";
import { getAcceptedMemberships } from "../utils/membership";
import { Badge, type BadgeProps } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import {
  DashboardLineChart,
  DashboardStatusDonut,
  TeamActivityBarChart,
} from "./components/DashboardCharts";

function formatDuration(milliseconds: number) {
  if (!milliseconds) return "0s";
  return milliseconds < 1000
    ? `${milliseconds}ms`
    : `${(milliseconds / 1000).toFixed(1)}s`;
}

function percentage(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "issued" || status === "ready_to_issue") {
    return "success";
  }
  if (status === "failed") return "danger";
  if (status === "draft") return "neutral";
  return "warning";
}

function DashboardCard({
  label,
  value,
  detail,
  color,
  valueClassName,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  color: string;
  valueClassName: string;
  icon: ReactNode;
}) {
  return (
    <Card className="dashboard-card relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${color}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="semlox-kpi-label dashboard-kpi-label uppercase tracking-[0.08em]">{label}</div>
          <div className={`semlox-kpi-value dashboard-kpi-value mt-2 ${valueClassName}`}>{value}</div>
          <div className="semlox-kpi-description dashboard-kpi-detail mt-1">{detail}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--semlox-radius-control)] bg-white/[0.04] text-[#60a5fa]">
          {icon}
        </div>
      </div>
    </Card>
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
    <Card className="dashboard-panel overflow-hidden">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="semlox-section-title">{title}</h2>
        {subtitle ? <p className="semlox-body dashboard-panel-subtitle mt-0.5">{subtitle}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function AnalyticsMetricBody({
  metrics,
  footer,
}: {
  metrics: Array<{
    label: string;
    value: string | number;
    description: string;
    valueClassName: string;
    blockClassName: string;
  }>;
  footer: ReactNode;
}) {
  return (
    <div className="dashboard-analytics-metric-body flex h-full min-h-[180px] flex-col p-4">
      <div className="grid flex-1 auto-rows-fr grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`dashboard-soft-metric-block grid h-[126px] grid-rows-[16px_34px_1fr] content-start rounded-[var(--semlox-radius-control)] border px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.06)] ${metric.blockClassName}`}
          >
            <div className="semlox-label dashboard-analytics-metric-label truncate uppercase tracking-[0.06em]">
              {metric.label}
            </div>
            <div className={`semlox-kpi-value dashboard-analytics-metric-value self-center ${metric.valueClassName}`}>
              {metric.value}
            </div>
            <p className="semlox-metadata dashboard-analytics-metric-description line-clamp-2 self-end">
              {metric.description}
            </p>
          </div>
        ))}
      </div>
      <div className="dashboard-analytics-metric-footer mt-4 border-t border-white/[0.08] pt-3">
        {footer}
      </div>
    </div>
  );
}

function CompletionRatio({
  statusSplit,
}: {
  statusSplit: DashboardData["statusSplit"];
}) {
  const completed = statusSplit.find((item) => item.name === "Issued")?.value || 0;
  const pending = statusSplit.reduce(
    (total, item) => total + (item.name === "Issued" ? 0 : item.value),
    0
  );
  const total = completed + pending;
  const completedPercent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <AnalyticsMetricBody
      metrics={[
        {
          label: "Completed",
          value: completed,
          description: "Issued AWB documents in the selected period.",
          valueClassName: "text-emerald-300",
          blockClassName: "metric-block-emerald border-emerald-400/20 bg-emerald-400/[0.06]",
        },
        {
          label: "Pending",
          value: pending,
          description: "Draft, review, ready, and failed documents.",
          valueClassName: "text-amber-300",
          blockClassName: "metric-block-amber border-amber-400/20 bg-amber-400/[0.06]",
        },
      ]}
      footer={
        <div>
          <div className="semlox-table-body mb-2 flex items-center justify-between">
            <span>Completion rate</span>
            <span className="semlox-identifier">{completedPercent}%</span>
          </div>
          <div className="dashboard-ratio-track flex h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="bg-emerald-400 transition-[width] duration-300"
              style={{ width: `${completedPercent}%` }}
            />
            <div className="flex-1 bg-amber-400/70" />
          </div>
        </div>
      }
    />
  );
}

function DocumentsTable({
  documents,
  company,
}: {
  documents: DashboardDocument[];
  company: boolean;
}) {
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const firstRowIndex = (activePage - 1) * pageSize;
  const visibleDocuments = documents.slice(firstRowIndex, firstRowIndex + pageSize);

  if (!documents.length) {
    return <EmptyState message="No pending AWB work." />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="dashboard-documents-table w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="semlox-table-header text-left uppercase tracking-[0.08em]">
              {["AWB Number", "File Name", ...(company ? ["Processed By"] : []), "Status", "Fields", "Updated", "Action"].map((label) => (
                <th key={label} className="border-b border-white/[0.08] px-4 py-2.5">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDocuments.map((document) => (
              <tr key={document.documentId} className="hover:bg-white/[0.025]">
                <td className="semlox-identifier dashboard-table-awb border-b border-white/[0.05] px-4 py-2.5 font-mono">{document.awbNumber}</td>
                <td className="semlox-table-body dashboard-table-file border-b border-white/[0.05] px-4 py-2.5">{document.fileName}</td>
                {company ? <td className="semlox-table-body dashboard-table-file border-b border-white/[0.05] px-4 py-2.5">{document.processedBy}</td> : null}
                <td className="border-b border-white/[0.05] px-4 py-2.5"><Badge variant={statusVariant(document.status)}>{document.status.replaceAll("_", " ")}</Badge></td>
                <td className="semlox-table-body dashboard-table-fields border-b border-white/[0.05] px-4 py-2.5">{document.fields.captured}/{document.fields.total}</td>
                <td className="semlox-metadata dashboard-table-updated border-b border-white/[0.05] px-4 py-2.5">{formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}</td>
                <td className="border-b border-white/[0.05] px-4 py-2.5">
                  <Link href={`/dashboard/awb?documentId=${document.documentId}`} className="semlox-compact-action h-7">
                    {document.status === "draft" ? "Open Draft" : "Continue Review"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="dashboard-table-pagination flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-2.5">
          <p className="semlox-table-body">
            Showing {firstRowIndex + 1}-{Math.min(firstRowIndex + pageSize, documents.length)} of {documents.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              size="compact"
              className="dashboard-pagination-button gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="semlox-table-body min-w-[72px] text-center">
              Page {activePage} of {totalPages}
            </span>
            <Button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              size="compact"
              className="dashboard-pagination-button gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="semlox-body flex min-h-40 items-center justify-center">
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
  const membershipsQuery = useMemberships();
  const dashboardQuery = useDashboardData(scope, selectedCompanyId, range, {
    enabled: allowed,
  });
  const data = dashboardQuery.data;
  const dashboardError = dashboardQuery.error;

  useEffect(() => {
    selectedCompanyIdRef.current = selectedCompanyId;
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!isHydrated) return;
    if (membershipsQuery.isPending) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (membershipsQuery.isError) {
        const status = membershipErrorStatus(membershipsQuery.error);
        if (status === 401 || status === 403) router.replace("/login");
        else {
          setInitializationError("Unable to load your company memberships.");
        }
        return;
      }

      const accepted = getAcceptedMemberships(membershipsQuery.data);
      if (!accepted.length) {
        setInitializationError("No active company membership was found for this account.");
        return;
      }
      const currentCompanyId = selectedCompanyIdRef.current;
      const currentCompanyIsValid = accepted.some(
        (membership) => membership.company_id === currentCompanyId
      );
      if (!currentCompanyIsValid) {
        setSelectedCompanyId(accepted[0].company_id, true);
      }
      setInitializationError("");
      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    isHydrated,
    membershipsQuery.data,
    membershipsQuery.error,
    membershipsQuery.isError,
    membershipsQuery.isPending,
    router,
    setSelectedCompanyId,
  ]);

  if ((!isHydrated || !allowed || dashboardQuery.isPending) && !initializationError) {
    return (
      <main className="flex h-full items-center justify-center bg-[#04060f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2f80ff]" />
      </main>
    );
  }

  if (initializationError || dashboardError || !data) {
    return (
      <main className="flex h-full items-center justify-center bg-[#04060f] px-4 text-center">
        <div>
          <div className="semlox-section-title text-red-300">{initializationError || dashboardError?.message || "No dashboard data yet."}</div>
          {!initializationError ? <Button variant="solid" size="compact" onClick={() => void dashboardQuery.refetch()} className="mt-4 px-4">Retry</Button> : null}
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
      valueClassName: "text-blue-300",
      icon: <FileText className="h-4 w-4" />,
    },
    { label: "Needs Review", value: stats.needsReview || 0, detail: "Review required + drafts", color: "bg-gradient-to-r from-orange-500 to-amber-500", valueClassName: "text-orange-300", icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Drafts", value: stats.drafts || 0, detail: "Pending completion", color: "bg-gradient-to-r from-amber-500 to-yellow-400", valueClassName: "text-amber-300", icon: <FilePenLine className="h-4 w-4" /> },
    { label: "Issued AWBs", value: stats.issued || 0, detail: "Completed documents", color: "bg-gradient-to-r from-emerald-500 to-cyan-500", valueClassName: "text-emerald-300", icon: <FileCheck2 className="h-4 w-4" /> },
  ];
  const secondaryCards = [
    { label: "Failed", value: stats.failed || 0, detail: "Processing failures", color: "bg-gradient-to-r from-red-500 to-orange-500", valueClassName: "text-red-300", icon: <XCircle className="h-4 w-4" /> },
    { label: "Avg Processing Time", value: formatDuration(stats.avgProcessingTimeMs || 0), detail: "Completed extraction average", color: "bg-gradient-to-r from-violet-500 to-blue-500", valueClassName: "text-violet-300", icon: <Clock3 className="h-4 w-4" /> },
    { label: "Avg AI Confidence", value: percentage(stats.avgConfidence || 0), detail: "Model confidence, not accuracy", color: "bg-gradient-to-r from-cyan-500 to-blue-500", valueClassName: "text-cyan-300", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Fields Corrected", value: stats.fieldsCorrected || 0, detail: `${percentage(stats.correctionRate || 0)} correction rate`, color: "bg-gradient-to-r from-fuchsia-500 to-violet-500", valueClassName: "text-fuchsia-300", icon: <WandSparkles className="h-4 w-4" /> },
  ];

  return (
    <main className="dashboard-real h-full overflow-y-auto bg-[#04060f] px-5 py-4 text-white">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3">
        <PageHeader
          title={company ? "Company AWB Overview" : "My AWB Overview"}
          description={company ? "Company-wide AWB processing performance and team workload" : "What needs your attention and what you completed"}
          actions={
            <>
            {data.canViewCompanyDashboard || company ? (
              <div className="inline-flex rounded-[var(--semlox-radius-control)] border border-white/[0.08] bg-white/[0.025] p-1">
                <Button variant={scope === "user" ? "solid" : "ghost"} size="toggle" onClick={() => { if (scope !== "user") setScope("user"); }}>My Overview</Button>
                <Button variant={scope === "company" ? "solid" : "ghost"} size="toggle" onClick={() => { if (scope !== "company") setScope("company"); }}>Company Overview</Button>
              </div>
            ) : null}
            <Select value={range} onChange={(event) => setRange(event.target.value as Range)} aria-label="Dashboard date range">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
            <Button onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
              <RefreshCw className={dashboardQuery.isFetching ? "animate-spin" : ""} />
              {dashboardQuery.isFetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="primary" size="large" className="px-4" onClick={() => router.push("/dashboard/awb")}>
              <Upload />
              Upload New AWB
            </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{topCards.map((card) => <DashboardCard key={card.label} {...card} />)}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{secondaryCards.map((card) => <DashboardCard key={card.label} {...card} />)}</div>

        {company ? (
          <>
            <Panel title="Team Activity" subtitle="Uploaded, issued, and draft AWBs by user"><div className="p-3"><TeamActivityBarChart data={(data.teamActivity || []) as unknown as Array<Record<string, string | number | null>>} /></div></Panel>
            <Panel title="Team Activity Details" subtitle="Real company processing totals by accepted member">
              {!data.teamActivity?.length ? <EmptyState message="No team activity yet." /> : (
                <div className="overflow-x-auto"><table className="semlox-table-body w-full min-w-[860px] border-collapse"><thead><tr className="semlox-table-header text-left uppercase">{["User","Role","Uploaded","Issued","Drafts","Failed","Fields Corrected","Last Active"].map((label)=><th key={label} className="border-b border-white/[0.08] px-4 py-2.5">{label}</th>)}</tr></thead><tbody>{data.teamActivity.map((row)=><tr key={row.userId} className="hover:bg-white/[0.025]"><td className="border-b border-white/[0.05] px-4 py-3"><div className="semlox-identifier">{row.name}</div><div className="semlox-metadata">{row.email}</div></td><td className="semlox-table-body border-b border-white/[0.05] px-4 py-3">{row.role}</td>{[row.uploaded,row.issued,row.drafts,row.failed,row.fieldsCorrected].map((value,index)=><td key={index} className="semlox-table-body border-b border-white/[0.05] px-4 py-3">{value}</td>)}<td className="semlox-metadata border-b border-white/[0.05] px-4 py-3">{row.lastActive ? formatDistanceToNow(new Date(row.lastActive), { addSuffix: true }) : "No activity"}</td></tr>)}</tbody></table></div>
              )}
            </Panel>
          </>
        ) : null}

        {company ? (
          <Panel title="Recent Exceptions" subtitle="Failures and documents with elevated review needs">
            {!data.exceptions?.length ? <EmptyState message="No recent exceptions." /> : <div className="divide-y divide-white/[0.06]">{data.exceptions.map((item)=><Link key={item.documentId} href={`/dashboard/awb?documentId=${item.documentId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.025]"><AlertTriangle className="h-4 w-4 text-amber-300" /><div className="min-w-0 flex-1"><div className="semlox-identifier truncate">{item.awbNumber}</div><div className="semlox-metadata mt-0.5 truncate">{item.fileName} / {item.status.replaceAll("_"," ")}</div></div><span className="semlox-metadata">{item.fields.warnings} flagged</span></Link>)}</div>}
          </Panel>
        ) : null}

        <div className="dashboard-analytics-row grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="[&>section]:h-full">
            <Panel title={company ? "Company Processing Trend" : "My AWB Processing Trend"} subtitle={`Real document activity over the last ${range.replace("d", " days")}`}><div className="p-3"><DashboardLineChart data={data.trend} /></div></Panel>
          </div>
          <div className="[&>section]:h-full">
            <Panel title={company ? "Company Status Split" : "My Status Split"} subtitle="Current document status distribution"><div className="p-3"><DashboardStatusDonut data={data.statusSplit} /></div></Panel>
          </div>
        </div>

        <div className="dashboard-analytics-row grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="[&>section]:h-full">
            <Panel title="AI Quality Signal" subtitle="Confidence and human correction are measured separately">
              <AnalyticsMetricBody
                metrics={[
                  {
                    label: "Avg AI Confidence",
                    value: percentage(stats.avgConfidence || 0),
                    description: "The model's confidence estimate.",
                    valueClassName: "text-cyan-300",
                    blockClassName: "metric-block-cyan border-cyan-400/20 bg-cyan-400/[0.06]",
                  },
                  {
                    label: "Human Correction Rate",
                    value: percentage(stats.correctionRate || 0),
                    description: "Fields changed from the AI original value.",
                    valueClassName: "text-fuchsia-300",
                    blockClassName: "metric-block-rose border-fuchsia-400/20 bg-fuchsia-400/[0.06]",
                  },
                ]}
                footer={
                  <p className="semlox-table-body">
                    Confidence and human correction are tracked independently.
                  </p>
                }
              />
            </Panel>
          </div>
          <div className="[&>section]:h-full">
            <Panel title="Completion vs Pending Work Ratio" subtitle="Issued documents compared with all open statuses">
              <CompletionRatio statusSplit={data.statusSplit} />
            </Panel>
          </div>
        </div>

        <Panel title={company ? "Active AWB Documents" : "Pending Work"} subtitle={company ? "Company documents requiring attention" : "Drafts and reviews waiting for you"}><DocumentsTable documents={documents} company={company} /></Panel>
      </div>
      <style jsx global>{`
        .dashboard-theme-light .dashboard-real { background: #f4f7fb !important; color: #0f172a !important; }
        .dashboard-theme-light .dashboard-real [class*="border-white"] { border-color: #d5deea !important; }
        .dashboard-real .dashboard-card { box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16); }
        .dashboard-theme-light .dashboard-real .dashboard-card { box-shadow: 0 12px 30px rgba(15, 23, 42, 0.09); }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-blue-300 { color: #2563eb !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-orange-300 { color: #ea580c !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-amber-300 { color: #b45309 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-emerald-300 { color: #059669 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-red-300 { color: #dc2626 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-violet-300 { color: #7c3aed !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-cyan-300 { color: #0891b2 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-kpi-value.text-fuchsia-300 { color: #c026d3 !important; }
        .dashboard-theme-light .dashboard-real .dashboard-documents-table thead { background: #f8fafc; }
        .dashboard-theme-light .dashboard-real .dashboard-table-pagination { border-color: #d5deea !important; background: #f8fafc; }
        .dashboard-theme-light .dashboard-real .dashboard-soft-metric-block {
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.045);
        }
        .dashboard-theme-light .dashboard-real .metric-block-cyan {
          border-color: #c8eaf0 !important;
          background: #f0fbfd !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-rose {
          border-color: #f1d2e5 !important;
          background: #fff5fa !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-emerald {
          border-color: #cce9dd !important;
          background: #f1fbf7 !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-amber {
          border-color: #f0dfb8 !important;
          background: #fffaf0 !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-cyan .dashboard-analytics-metric-value {
          color: #087f8c !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-rose .dashboard-analytics-metric-value {
          color: #b83280 !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-emerald .dashboard-analytics-metric-value {
          color: #167a58 !important;
        }
        .dashboard-theme-light .dashboard-real .metric-block-amber .dashboard-analytics-metric-value {
          color: #a45f08 !important;
        }
        .dashboard-theme-dark .dashboard-real .metric-block-cyan {
          border-color: rgba(34, 211, 238, 0.18) !important;
          background: rgba(34, 211, 238, 0.055) !important;
        }
        .dashboard-theme-dark .dashboard-real .metric-block-rose {
          border-color: rgba(232, 121, 249, 0.18) !important;
          background: rgba(232, 121, 249, 0.05) !important;
        }
        .dashboard-theme-dark .dashboard-real .metric-block-emerald {
          border-color: rgba(52, 211, 153, 0.18) !important;
          background: rgba(52, 211, 153, 0.055) !important;
        }
        .dashboard-theme-dark .dashboard-real .metric-block-amber {
          border-color: rgba(251, 191, 36, 0.18) !important;
          background: rgba(251, 191, 36, 0.055) !important;
        }
        .dashboard-theme-light .dashboard-real .dashboard-analytics-metric-label,
        .dashboard-theme-light .dashboard-real .dashboard-analytics-metric-description,
        .dashboard-theme-light .dashboard-real .dashboard-analytics-metric-footer,
        .dashboard-theme-light .dashboard-real .dashboard-analytics-metric-footer [class*="text-[#94a3b8]"] {
          color: #52647a !important;
        }
        .dashboard-theme-light .dashboard-real .dashboard-analytics-metric-footer {
          border-color: #d5deea !important;
        }
        .dashboard-theme-light .dashboard-real .dashboard-ratio-track {
          background: #dbe4f0 !important;
        }
      `}</style>
    </main>
  );
}
