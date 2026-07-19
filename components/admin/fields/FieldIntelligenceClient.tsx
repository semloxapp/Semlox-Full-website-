"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminBarChart } from "@/components/admin/charts/AdminCharts";
import { AdminCard, AdminConfidenceBadge, AdminEmptyState, AdminFilterBar, AdminMetricCard, AdminPageHeader, AdminTableWrap } from "@/components/admin/AdminUI";
import { getAdminFieldIntelligence } from "@/lib/admin/client";
import type { AdminFieldIntelligenceResponse, AdminFieldIntelligenceSortField, AdminFieldIntelligenceStatusFilter, AdminSortOrder } from "@/lib/admin/types";
import { FieldIntelligenceDrawer } from "./FieldIntelligenceDrawer";
import { useAdminAnalyticsScope } from "@/components/admin/layout/AdminAnalyticsFilters";

const chartData = (items: AdminFieldIntelligenceResponse["items"], key: "editedFieldCount" | "averageConfidence" | "missingCount" | "needsReviewRate", ascending = false) => [...items]
  .filter((item) => item[key] !== null)
  .sort((a, b) => ascending ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]))
  .slice(0, 6)
  .map((item) => ({ name: item.fieldLabel, value: Number(item[key]), occurrences: item.occurrenceCount, count: key === "needsReviewRate" ? item.needsReviewCount : Number(item[key]) }));

export function FieldIntelligenceClient() {
  const { scope, query } = useAdminAnalyticsScope();
  const [data, setData] = useState<AdminFieldIntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminFieldIntelligenceStatusFilter | "">("");
  const [sortBy, setSortBy] = useState<AdminFieldIntelligenceSortField>("editedFieldRate");
  const [sortOrder, setSortOrder] = useState<AdminSortOrder>("desc");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const controller = new AbortController();
    getAdminFieldIntelligence({ ...scope, search, status, sortBy, sortOrder }, controller.signal)
      .then((result) => { setData(result); setError(null); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("The analytics request failed. Try again.");
      });
    return () => controller.abort();
  }, [query, retryKey, scope, search, sortBy, sortOrder, status]);

  return <>
    <AdminPageHeader title="Field Intelligence" description="Real field-level extraction quality, review workload, and current differences."/>
    {!data && !error ? <div className="admin-overview-loading" aria-label="Loading field intelligence"><div className="admin-metric-grid">{Array.from({length:4},(_,index)=><div className="admin-skeleton admin-skeleton-metric" key={index}/>)}</div><div className="admin-grid-2"><div className="admin-skeleton admin-skeleton-chart"/><div className="admin-skeleton admin-skeleton-chart"/></div><div className="admin-skeleton admin-skeleton-chart"/></div> : error ? <div className="admin-overview-error"><AdminEmptyState title="Data could not be loaded." description={error}/><button className="admin-button admin-button-primary" onClick={()=>setRetryKey((value)=>value+1)}><RefreshCw size={13}/>Retry</button></div> : data ? <>
      <div className="admin-metric-grid"><AdminMetricCard label="Raw Field Records" value={String(data.summary.totalFieldRows)} note="Includes retained historical records" tone="info"/><AdminMetricCard label="Current AWB Field Types" value={String(data.summary.distinctFieldCount)} note="Current normalized API contract" tone="info"/><AdminMetricCard label="Needs Review" value={String(data.summary.needsReviewFieldCount)} note="Separate overlapping review flag" tone="warning"/><AdminMetricCard label="Fields Different from AI Output" value={String(data.summary.editedFieldCount)} note="Current stored values only" tooltip="Counts field records whose current stored value differs from the original AI-extracted value. Historical correction events are not yet available." tone="partial"/></div>
      <div className="admin-grid-2"><AdminCard title="Fields Different from AI Output" description="Count of current canonical field rows whose stored value differs from the original AI output."><AdminBarChart horizontal data={chartData(data.items,"editedFieldCount")} categoryLabel="AWB field" valueLabel="Difference count"/></AdminCard><AdminCard title="Lowest-Confidence Fields" description="Current AWB fields with the lowest average valid extraction confidence. Lower is worse; confidence is not accuracy."><AdminBarChart horizontal unit="percent" data={chartData(data.items,"averageConfidence",true)} categoryLabel="AWB field" valueLabel="Average confidence"/></AdminCard><AdminCard title="Most Frequently Missing Fields" description="Number of rows stored with field status Missing, grouped by current AWB field."><AdminBarChart horizontal data={chartData(data.items,"missingCount")} categoryLabel="AWB field" valueLabel="Missing records"/></AdminCard><AdminCard title="Highest Needs-Review Rate" description="Percentage of each field's occurrences where needs_review is true."><AdminBarChart horizontal unit="percent" data={chartData(data.items,"needsReviewRate")} categoryLabel="AWB field" valueLabel="Needs-review rate" tooltipNote={(item)=>`${item.count} needs-review rows out of ${item.occurrences} occurrences`}/></AdminCard></div>
      <AdminFilterBar><label className="admin-sr-only" htmlFor="field-intelligence-search">Search fields</label><input id="field-intelligence-search" type="search" value={input} maxLength={100} placeholder="Search field key or label" onChange={(event)=>setInput(event.target.value)}/><label className="admin-sr-only" htmlFor="field-intelligence-status">Field status filter</label><select id="field-intelligence-status" value={status} onChange={(event)=>setStatus(event.target.value as AdminFieldIntelligenceStatusFilter | "")}><option value="">All field groups</option><option value="valid">Contains valid rows</option><option value="warning">Contains warnings</option><option value="review">Contains review status</option><option value="missing">Contains missing rows</option><option value="needs_review">Needs-review flag</option><option value="edited">Different from AI output</option></select><label className="admin-sr-only" htmlFor="field-intelligence-sort">Sort fields</label><select id="field-intelligence-sort" value={sortBy} onChange={(event)=>setSortBy(event.target.value as AdminFieldIntelligenceSortField)}><option value="editedFieldRate">Difference rate</option><option value="averageConfidence">Average confidence</option><option value="needsReviewRate">Needs-review rate</option><option value="missingRate">Missing rate</option><option value="coverageRate">Coverage</option><option value="occurrenceCount">Occurrences</option><option value="documentCount">Documents</option><option value="fieldLabel">Field label</option></select><button className="admin-button" onClick={()=>setSortOrder((value)=>value==="asc"?"desc":"asc")} aria-label={`Sort ${sortOrder==="asc"?"descending":"ascending"}`}>{sortOrder==="asc"?"Ascending":"Descending"}</button></AdminFilterBar>
      <AdminCard title="Field Performance Table" description="Select a field for real document-level examples">{data.items.length ? <AdminTableWrap><table className="admin-table"><thead><tr><th>Field</th><th>Occurrences</th><th>Documents</th><th>Coverage</th><th>Avg Confidence</th><th>Needs Review</th><th>Different from AI</th><th>Missing</th><th>Main Issue</th><th>Action</th></tr></thead><tbody>{data.items.map((field)=><tr key={field.fieldKey} data-clickable="true" onClick={()=>setSelectedKey(field.fieldKey)}><td><strong>{field.fieldLabel}</strong><br/><small>{field.fieldKey}</small></td><td>{field.occurrenceCount}</td><td>{field.documentCount}</td><td>{field.coverageRate}%</td><td>{field.averageConfidence === null ? "Unavailable" : <AdminConfidenceBadge value={field.averageConfidence}/>}</td><td>{field.needsReviewCount} ({field.needsReviewRate}%)</td><td>{field.editedFieldCount} ({field.editedFieldRate}%)</td><td>{field.missingCount} ({field.missingRate}%)</td><td>{field.primaryIssue.replace("_"," ")}</td><td><button className="admin-button" onClick={(event)=>{event.stopPropagation();setSelectedKey(field.fieldKey)}} aria-label={`View ${field.fieldLabel} details`}>View</button></td></tr>)}</tbody></table></AdminTableWrap> : <AdminEmptyState title={search || status ? "No fields match the selected filters" : "No field analytics are available"} description="Try changing the search or status filter."/>}</AdminCard>
    </> : null}
    {selectedKey ? <FieldIntelligenceDrawer fieldKey={selectedKey} onClose={()=>setSelectedKey(null)}/> : null}
  </>;
}
