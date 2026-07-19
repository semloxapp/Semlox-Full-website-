"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { AdminConfidenceBadge, AdminEmptyState, AdminStatusBadge, CorrectionDiff } from "@/components/admin/AdminUI";
import { getAdminDocumentById } from "@/lib/admin/client";
import type { AdminDocumentDetail } from "@/lib/admin/types";

type Tab = "overview" | "fields" | "differences" | "processing";
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const displayValue = (value: string | null) => value === null || value === "" ? "Unavailable" : value;

export function DocumentDetailDrawer({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [data, setData] = useState<AdminDocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("keydown", close); previous?.focus(); };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    getAdminDocumentById(documentId, controller.signal).then((result)=>{setData(result);setError(null)}).catch((reason: unknown)=>{
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "Document details could not be loaded.");
    });
    return () => controller.abort();
  }, [documentId, retryKey]);

  const fields = tab === "differences" ? data?.fields.filter((field)=>field.isDifferentFromAiOutput) ?? [] : data?.fields ?? [];
  return <div className="admin-drawer-overlay" role="presentation" onMouseDown={onClose}><aside className="admin-drawer" role="dialog" aria-modal="true" aria-label="Document audit details" onMouseDown={(event)=>event.stopPropagation()}><header className="admin-drawer-header"><div><h2>{data?.awbNumber ?? documentId.slice(0,8)}</h2><p>{data?.fileName ?? "Loading document details"}</p></div><button ref={closeRef} className="admin-icon-button" onClick={onClose} aria-label="Close document details"><X size={15}/></button></header><div className="admin-drawer-body">
    {!data && !error ? <div className="admin-overview-loading" aria-label="Loading document details"><div className="admin-skeleton admin-skeleton-title"/><div className="admin-skeleton admin-skeleton-chart"/></div> : error ? <div className="admin-overview-error"><AdminEmptyState title="Document details could not be loaded" description={error}/><button className="admin-button admin-button-primary" onClick={()=>setRetryKey((value)=>value+1)}><RefreshCw size={13}/>Retry</button></div> : data ? <>
      <div className="admin-filter-bar" role="tablist" aria-label="Document detail sections">{(["overview","fields","differences","processing"] as Tab[]).map((item)=><button role="tab" aria-selected={tab===item} key={item} className={`admin-button ${tab===item?"admin-button-primary":""}`} onClick={()=>setTab(item)}>{item === "differences" ? "Current Differences" : item[0].toUpperCase()+item.slice(1)}</button>)}</div>
      {tab === "overview" ? <div className="admin-detail-grid"><Detail label="AWB number" value={data.awbNumber ?? "Unavailable"}/><Detail label="Status" value={<AdminStatusBadge status={data.status}/>}/><Detail label="File" value={data.fileName ?? "Unavailable"}/><Detail label="Model version" value="Unavailable"/><Detail label="Created" value={formatDate(data.createdAt)}/><Detail label="Updated" value={formatDate(data.updatedAt)}/><Detail label="Processing time" value={data.processingTimeSeconds === null ? "Unavailable" : `${data.processingTimeSeconds}s`}/><Detail label="Average confidence" value={data.averageConfidence === null ? "Unavailable" : <AdminConfidenceBadge value={data.averageConfidence}/>}/><Detail label="Total fields" value={data.summary.fieldCount}/><Detail label="Needs review" value={data.summary.needsReviewFieldCount}/><Detail label="Edited fields" value={data.summary.editedFieldCount}/></div> : null}
      {tab === "fields" || tab === "differences" ? <><p className="admin-drawer-note">{tab === "differences" ? "Shows fields whose current stored value differs from the original AI-extracted value. Historical correction events are not yet available." : "Real persisted extraction fields for this document."}</p>{fields.length ? <div className="admin-field-detail-list">{fields.map((field)=><article className="admin-field-detail" key={field.id}><header><strong>{field.fieldLabel}</strong><AdminStatusBadge status={field.status}/></header>{tab === "differences" ? <CorrectionDiff before={displayValue(field.originalAiValue)} after={displayValue(field.currentValue)}/> : <div className="admin-detail-grid"><Detail label="Original AI value" value={displayValue(field.originalAiValue)}/><Detail label="Current value" value={displayValue(field.currentValue)}/></div>}<div className="admin-field-meta"><span>{field.confidence === null ? "Confidence unavailable" : `Confidence ${field.confidence}%`}</span><span>{field.needsReview ? "Needs review" : "No review flag"}</span><span>{field.isDifferentFromAiOutput ? "Different from AI output" : "Matches AI output"}</span></div></article>)}</div> : <AdminEmptyState title={tab === "differences" ? "No current differences" : "No extracted fields are available for this document"} description={tab === "differences" ? "Current stored field values match the original AI output." : "The document may have failed before field extraction."}/>}</> : null}
      {tab === "processing" ? <><div className="admin-detail-grid"><Detail label="Total processing time" value={data.processingTimeSeconds === null ? "Unavailable" : `${data.processingTimeSeconds}s`}/><Detail label="Status" value={<AdminStatusBadge status={data.status}/>}/><Detail label="Created" value={formatDate(data.createdAt)}/><Detail label="Updated" value={formatDate(data.updatedAt)}/></div><AdminEmptyState title="Detailed stage timing is not available for this document" description="No processing-stage timing or model-version metadata is currently persisted."/></> : null}
    </> : null}
  </div></aside></div>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="admin-detail-item"><span>{label}</span><strong>{value}</strong></div>;
}
