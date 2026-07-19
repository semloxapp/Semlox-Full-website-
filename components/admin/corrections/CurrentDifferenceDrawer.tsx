"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { AdminConfidenceBadge, AdminEmptyState, AdminStatusBadge } from "@/components/admin/AdminUI";
import { getAdminCurrentDifferenceDetail } from "@/lib/admin/client";
import type { AdminCurrentDifferenceDetail } from "@/lib/admin/types";
import { CurrentDifferenceDiff } from "./CurrentDifferenceDiff";

const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Unavailable";
const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="admin-detail-item"><span>{label}</span><strong>{children}</strong></div>;

export function CurrentDifferenceDrawer({ fieldId, onClose }: { fieldId: string; onClose: () => void }) {
  const [data, setData] = useState<AdminCurrentDifferenceDetail | null>(null); const [error, setError] = useState<string | null>(null); const [retry, setRetry] = useState(0); const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  useEffect(() => { const controller = new AbortController(); getAdminCurrentDifferenceDetail(fieldId, controller.signal).then((result) => { setData(result); setError(null); }).catch((reason: unknown) => { if (reason instanceof DOMException && reason.name === "AbortError") return; setError(reason instanceof Error ? reason.message : "Current-difference details could not be loaded."); }); return () => controller.abort(); }, [fieldId, retry]);
  return <div className="admin-drawer-overlay" role="presentation" onMouseDown={onClose}><aside className="admin-drawer" role="dialog" aria-modal="true" aria-label="Current difference details" onMouseDown={(event) => event.stopPropagation()}><header className="admin-drawer-header"><div><h2>{data?.field.label ?? "Current Difference"}</h2><p>{data?.document.fileName ?? "Loading real field details"}</p></div><button ref={closeRef} className="admin-icon-button" onClick={onClose} aria-label="Close current difference details"><X size={15}/></button></header><div className="admin-drawer-body">
    {!data && !error ? <div className="admin-overview-loading" aria-label="Loading difference details"><div className="admin-skeleton admin-skeleton-title"/><div className="admin-skeleton admin-skeleton-chart"/></div> : error ? <div className="admin-overview-error"><AdminEmptyState title="Current-difference details could not be loaded" description={error}/><button className="admin-button admin-button-primary" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={13}/>Retry</button></div> : data ? <>
      <section><h3>Comparison</h3><CurrentDifferenceDiff original={data.field.originalAiValue} current={data.field.currentValue}/></section>
      <section><h3>Field Information</h3><div className="admin-detail-grid"><Detail label="Field key">{data.field.key}</Detail><Detail label="Current contract">{data.field.isCurrentCanonicalField ? "Current canonical field" : "Legacy field record"}</Detail><Detail label="Confidence">{data.field.confidence === null ? "Unavailable" : <AdminConfidenceBadge value={data.field.confidence}/>}</Detail><Detail label="Field status"><AdminStatusBadge status={data.field.status}/></Detail><Detail label="Needs review">{data.field.needsReview ? "Yes" : "No"}</Detail><Detail label="Last field update">{date(data.field.updatedAt)}</Detail></div></section>
      <section><h3>Document Information</h3><div className="admin-detail-grid"><Detail label="Document">{data.document.id.slice(0, 8)}</Detail><Detail label="File">{data.document.fileName ?? "Unavailable"}</Detail><Detail label="AWB number">{data.document.awbNumber ?? "Unavailable"}</Detail><Detail label="Document status"><AdminStatusBadge status={data.document.status}/></Detail><Detail label="Document fields">{data.context.documentFieldCount}</Detail><Detail label="Current differences">{data.context.documentDifferenceCount}</Detail><Detail label="Average confidence">{data.context.documentAverageConfidence === null ? "Unavailable" : `${data.context.documentAverageConfidence}%`}</Detail><Detail label="Document updated">{date(data.document.updatedAt)}</Detail></div></section>
      <p className="admin-drawer-note">Historical correction events, corrected-by users, edit counts, correction reasons, and exact correction timestamps are not available for this record.</p>
    </> : null}
  </div></aside></div>;
}
