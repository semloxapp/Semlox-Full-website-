"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AdminCard, AdminConfidenceBadge, AdminEmptyState, AdminFilterBar, AdminPageHeader, AdminStatusBadge, AdminTableWrap, AdminUnavailableNotice } from "@/components/admin/AdminUI";
import { getAdminDocuments } from "@/lib/admin/client";
import type { AdminDocumentListResponse, AdminDocumentSortField, AdminSortOrder } from "@/lib/admin/types";
import { DocumentDetailDrawer } from "./DocumentDetailDrawer";
import { useAdminAnalyticsScope } from "@/components/admin/layout/AdminAnalyticsFilters";

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function TableLoading() {
  return <div className="admin-overview-loading" aria-label="Loading documents"><div className="admin-skeleton admin-skeleton-title"/><div className="admin-skeleton admin-skeleton-chart"/></div>;
}

export function DocumentAuditClient({ initialDocumentId = null }: { initialDocumentId?: string | null }) {
  const { scope, query } = useAdminAnalyticsScope();
  const [data, setData] = useState<AdminDocumentListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<AdminDocumentSortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<AdminSortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocumentId);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(input.trim()); setPage(1); }, 400);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const controller = new AbortController();
    getAdminDocuments({ ...scope, page, pageSize, search, status, sortBy, sortOrder }, controller.signal)
      .then((result) => { setData(result); setError(null); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("The analytics request failed. Try again.");
      });
    return () => controller.abort();
  }, [page, pageSize, query, retryKey, scope, search, sortBy, sortOrder, status]);

  const changeStatus = useCallback((value: string) => { setStatus(value); setPage(1); }, []);
  const changeSort = useCallback((value: AdminDocumentSortField) => { setSortBy(value); setPage(1); }, []);

  return <>
    <AdminPageHeader title="Document Audit Explorer" description="Trace real AWB extraction results from document summary to individual fields."/>
    <AdminUnavailableNotice title="Model version is not currently stored" description="The unsupported Model column is omitted from the document table. No model value is inferred."/>
    <AdminFilterBar>
      <label className="admin-sr-only" htmlFor="admin-document-search">Search documents</label>
      <input id="admin-document-search" type="search" value={input} onChange={(event)=>setInput(event.target.value)} placeholder="Search document, AWB number, file, or UUID" maxLength={100}/>
      <label className="admin-sr-only" htmlFor="admin-document-status">Document status</label>
      <select id="admin-document-status" value={status} onChange={(event)=>changeStatus(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="failed">Failed</option><option value="issued">Issued</option><option value="review_required">Review Required</option></select>
      <label className="admin-sr-only" htmlFor="admin-document-sort">Sort documents</label>
      <select id="admin-document-sort" value={sortBy} onChange={(event)=>changeSort(event.target.value as AdminDocumentSortField)}><option value="updatedAt">Updated</option><option value="createdAt">Created</option><option value="fileName">File name</option><option value="status">Status</option><option value="processingTime">Processing time</option></select>
      <button className="admin-button" onClick={()=>{setSortOrder((value)=>value==="asc"?"desc":"asc");setPage(1)}} aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}>{sortOrder === "asc" ? "Ascending" : "Descending"}</button>
      <label className="admin-sr-only" htmlFor="admin-document-page-size">Rows per page</label>
      <select id="admin-document-page-size" value={pageSize} onChange={(event)=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="10">10 rows</option><option value="25">25 rows</option><option value="50">50 rows</option><option value="100">100 rows</option></select>
    </AdminFilterBar>
    <AdminCard title="Processed Documents" description="Select a row to inspect real persisted fields">
      {!data && !error ? <TableLoading/> : error ? <div className="admin-overview-error"><AdminEmptyState title="Data could not be loaded." description={error}/><button className="admin-button admin-button-primary" onClick={()=>setRetryKey((value)=>value+1)}><RefreshCw size={13}/>Retry</button></div> : data && data.items.length ? <>
        <AdminTableWrap><table className="admin-table"><thead><tr><th>Date</th><th>Document / File</th><th>AWB Number</th><th>Status</th><th>Fields</th><th>Edited Fields</th><th>Confidence</th><th>Processing Time</th><th>Action</th></tr></thead><tbody>{data.items.map((item)=><tr key={item.id} data-clickable="true" onClick={()=>setSelectedId(item.id)}><td>{formatDate(item.updatedAt)}</td><td><strong>{item.id.slice(0,8)}</strong><br/><span>{item.fileName ?? "Unavailable"}</span></td><td>{item.awbNumber ?? "Unavailable"}</td><td><AdminStatusBadge status={item.status}/></td><td>{item.fieldCount}</td><td>{item.editedFieldCount}</td><td>{item.averageConfidence === null ? "Unavailable" : <AdminConfidenceBadge value={item.averageConfidence}/>}</td><td>{item.processingTimeSeconds === null ? "Unavailable" : `${item.processingTimeSeconds}s`}</td><td><button className="admin-button" onClick={(event)=>{event.stopPropagation();setSelectedId(item.id)}} aria-label={`View document ${item.id}`}>View</button></td></tr>)}</tbody></table></AdminTableWrap>
        <div className="admin-pagination"><span>Showing {(data.pagination.page-1)*data.pagination.pageSize+1}–{Math.min(data.pagination.page*data.pagination.pageSize,data.pagination.totalItems)} of {data.pagination.totalItems} documents</span><div><button onClick={()=>setPage((value)=>value-1)} disabled={page<=1} aria-label="Previous page"><ChevronLeft size={14}/></button><span className="admin-filter-chip">Page {page} of {Math.max(1,data.pagination.totalPages)}</span><button onClick={()=>setPage((value)=>value+1)} disabled={page>=data.pagination.totalPages} aria-label="Next page"><ChevronRight size={14}/></button></div></div>
      </> : <AdminEmptyState title="No documents were found" description={search || status ? "No documents match the selected filters." : "No processed AWB documents are available."}/>} 
    </AdminCard>
    {selectedId ? <DocumentDetailDrawer documentId={selectedId} onClose={()=>setSelectedId(null)}/> : null}
  </>;
}
