"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { AdminBarChart, AdminDonutChart, AdminQualityChart } from "@/components/admin/charts/AdminCharts";
import { AdminCard, AdminConfidenceBadge, AdminEmptyState, AdminMetricCard, AdminPageHeader, AdminStatusBadge, AdminTableWrap } from "@/components/admin/AdminUI";
import { getAdminOverview } from "@/lib/admin/client";
import type { AdminOverviewResponse } from "@/lib/admin/types";
import { useAdminAnalyticsScope } from "@/components/admin/layout/AdminAnalyticsFilters";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));

function OverviewLoading() {
  return <div className="admin-overview-loading" aria-label="Loading analytics"><div className="admin-skeleton admin-skeleton-title"/><div className="admin-metric-grid">{Array.from({ length: 10 }, (_, index) => <div className="admin-skeleton admin-skeleton-metric" key={index}/>)}</div><div className="admin-grid-2"><div className="admin-skeleton admin-skeleton-chart"/><div className="admin-skeleton admin-skeleton-chart"/></div></div>;
}

export function AdminOverviewClient() {
  const { scope, query } = useAdminAnalyticsScope();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => setRequestKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    getAdminOverview(scope, controller.signal).then((result) => { setData(result); setError(null); }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError("The analytics request failed. Try again.");
    });
    return () => controller.abort();
  }, [query, requestKey, scope]);

  if (!data && !error) return <OverviewLoading/>;
  if (error) return <AdminCard title="AI Test Overview" description="Real AWB analytics"><div className="admin-overview-error"><AdminEmptyState title="Data could not be loaded." description={error}/><button className="admin-button admin-button-primary" onClick={retry}><RefreshCw size={13}/>Retry</button></div></AdminCard>;
  if (!data || data.metrics[0]?.value === "0") return <AdminCard title="AI Test Overview" description="Real AWB analytics"><AdminEmptyState title="No AWB documents found" description="Process an AWB document to populate this overview."/></AdminCard>;

  return <>
    <AdminPageHeader title="AI Test Overview" description="Live extraction quality, document status, current differences, and processing performance." actions={<><span className="admin-filter-chip">Live database</span><button className="admin-button" disabled title="Export integration pending"><Download size={13}/>Export</button></>}/>
    <div className="admin-metric-grid">{data.metrics.map((metric) => <AdminMetricCard key={metric.key} label={metric.label} value={metric.value} note={metric.note} tooltip={metric.tooltip} tone={metric.tone}/>)}</div>
    <div className="admin-grid-2 admin-grid-equal">
      <AdminCard title="Confidence & Current-Difference Trend" description="Daily average valid extraction confidence and current-difference rate, grouped by document creation date. Both series are percentages."><AdminQualityChart data={data.confidenceTrend}/></AdminCard>
      <AdminCard title="Document Status Distribution" description="Number of persisted documents in each mutually exclusive workflow status."><AdminDonutChart data={data.statusDistribution} totalLabel="Documents"/></AdminCard>
    </div>
    <div className="admin-grid-2 admin-grid-equal">
      <AdminCard title="Top Problematic Fields" description="Fields with the highest rate of current stored values that differ from the original AI output. Higher means more current differences among that field's occurrences."><AdminBarChart horizontal unit="percent" categoryLabel="AWB field" valueLabel="Current-difference rate" data={data.problemFields.map((field) => ({ name: field.name, value: field.correctionRate, occurrences: field.occurrences }))} tooltipNote={(item) => `${item.occurrences} field occurrences in scope`}/></AdminCard>
      <AdminCard title="Overall Field Agreement" description="How often the current persisted value still matches the original AI-extracted value. This measures agreement, not verified extraction accuracy."><div className="admin-agreement-kpi"><div className="admin-agreement-score"><strong>{data.fieldAgreement.rate}%</strong><span>Current agreement rate</span><small>{data.fieldAgreement.rate} out of every 100 persisted fields currently match the original AI output.</small></div><dl><div><dt>Matching AI output</dt><dd>{data.fieldAgreement.matchingFieldCount}</dd></div><div><dt>Total persisted fields</dt><dd>{data.fieldAgreement.totalFieldCount}</dd></div><div><dt>Current differences</dt><dd>{data.fieldAgreement.totalFieldCount-data.fieldAgreement.matchingFieldCount}</dd></div><div><dt>Current-difference rate</dt><dd>{Math.max(0, Number((100-data.fieldAgreement.rate).toFixed(1)))}%</dd></div></dl><p><strong>How it is calculated:</strong> matching fields ÷ total persisted fields. A difference means the current value no longer matches the original AI output; it does not prove which value is correct. Verified ground-truth accuracy is not stored.</p></div></AdminCard>
    </div>
    <div className="admin-grid-2 admin-grid-equal">
      <AdminCard title="Current Field Differences" description="Final stored values that differ from their original AI-extracted values"><div className="admin-card-padding"><p>Semlox keeps the original extracted value and the latest human-reviewed value. Per-edit revision history is intentionally not stored.</p><Link className="admin-button" href="/admin/corrections">View Current Differences</Link></div></AdminCard>
      <AdminCard title="Recent High-Risk Documents" description="Newest failed or review-required records from the live AWB database. Failed documents without extracted fields have no confidence value."><AdminTableWrap><table className="admin-table"><thead><tr><th>Document</th><th>File</th><th>Created</th><th>Confidence</th><th>Status</th><th>Inspect</th></tr></thead><tbody>{data.highRiskDocuments.map((item) => <tr key={item.id}><td>{item.id.slice(0, 8)}</td><td>{item.fileName}</td><td>{formatDate(item.createdAt)}</td><td>{item.confidence === null ? <span title="No valid extracted field confidence exists for this document">No extracted fields</span> : <AdminConfidenceBadge value={item.confidence}/>}</td><td><AdminStatusBadge status={item.status}/></td><td><Link className="admin-button admin-audit-link" href={`/admin/documents?document=${encodeURIComponent(item.id)}`}>Document Audit</Link></td></tr>)}</tbody></table></AdminTableWrap></AdminCard>
    </div>
  </>;
}
