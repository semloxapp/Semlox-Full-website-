"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCompany } from "../../context/CompanyContext";
import { fetchMemberships } from "../../utils/authClient";
import type { AwbExtractionResponse } from "@/lib/awb/types";

type HistoryScope = "my" | "company";
type HistoryStatus = AwbExtractionResponse["document"]["status"];
type SortKey = "createdAt" | "awbNumber" | "action" | "fields" | "processedBy" | "status";
type HistoryStats = {
  totalDocuments: number;
  successful: number;
  failed: number;
  drafts: number;
  issued: number;
};
type HistoryDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string | null;
  status: HistoryStatus;
  extractionMode: string;
  runId: string | null;
  pages: number;
  processingTimeMs: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  processedBy: { id: string; name: string; email: string };
  awbNumber: string;
  action: string;
  fields: {
    total: number;
    captured: number;
    valid: number;
    warnings: number;
    review: number;
    missing: number;
  };
};
type HistoryResponse = {
  scope: HistoryScope;
  canViewCompanyHistory: boolean;
  role: string;
  stats: HistoryStats;
  documents: HistoryDocument[];
};
type DocumentDetails = AwbExtractionResponse & {
  history?: {
    uploadedBy: string;
    fileSize: number;
    storagePath: string | null;
    createdAt: string;
    updatedAt: string;
    canEdit: boolean;
  };
};

const EMPTY_STATS: HistoryStats = {
  totalDocuments: 0,
  successful: 0,
  failed: 0,
  drafts: 0,
  issued: 0,
};

function messageFromPayload(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

function dateParts(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date),
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusConfig(status: HistoryStatus) {
  if (status === "issued") return { label: "AWB Issued", className: "history-b-issued" };
  if (status === "ready_to_issue") return { label: "Ready to Issue", className: "history-b-ok" };
  if (status === "draft") return { label: "Draft Saved", className: "history-b-draft" };
  if (status === "review_required") return { label: "Partial", className: "history-b-partial" };
  if (status === "failed") return { label: "Failed", className: "history-b-fail" };
  return {
    label: status === "extracting" ? "Processing" : "Uploaded",
    className: "history-b-neutral",
  };
}

function actionColor(action: string) {
  if (action === "Issued AWB") return "text-blue-400";
  if (action === "Draft Saved") return "text-amber-400";
  if (action === "Failed") return "text-red-400";
  return "text-cyan-400";
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return "U";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Checkbox({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`history-check ${checked ? "history-check-on" : ""}`}
    >
      {checked ? <Check className="h-2.5 w-2.5" /> : null}
    </button>
  );
}

const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const CALENDAR_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dateStringToLocal(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function localDateToString(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function CustomCalendar({
  value,
  onApply,
  onClear,
  onClose,
}: {
  value: string;
  onApply: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const initialValue = dateStringToLocal(value);
  const today = new Date();
  const [pending, setPending] = useState<Date | null>(initialValue);
  const [month, setMonth] = useState(initialValue?.getMonth() ?? today.getMonth());
  const [year, setYear] = useState(initialValue?.getFullYear() ?? today.getFullYear());
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; currentMonth: boolean }> = [];
  for (let index = 0; index < startOffset; index += 1) {
    cells.push({
      day: daysInPreviousMonth - startOffset + index + 1,
      currentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, currentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({
      day: cells.length - daysInMonth - startOffset + 1,
      currentMonth: false,
    });
  }

  const moveMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };

  return (
    <div className="history-calendar-popup" onClick={(event) => event.stopPropagation()}>
      <div className="history-calendar-header">
        <div className="flex gap-1">
          <button type="button" onClick={() => moveMonth(-1)} className="history-calendar-nav" aria-label="Previous month">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => moveMonth(1)} className="history-calendar-nav" aria-label="Next month">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-[13px] font-bold history-text">
          {CALENDAR_MONTHS[month]} {year}
        </div>
      </div>
      <div className="history-calendar-grid">
        {CALENDAR_DAYS.map((day) => (
          <div key={day} className="history-calendar-weekday">{day}</div>
        ))}
        {cells.map((cell, index) => {
          const isToday =
            cell.currentMonth &&
            cell.day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          const isSelected =
            Boolean(pending) &&
            cell.currentMonth &&
            cell.day === pending?.getDate() &&
            month === pending?.getMonth() &&
            year === pending?.getFullYear();
          return (
            <button
              key={`${cell.day}-${index}`}
              type="button"
              disabled={!cell.currentMonth}
              onClick={() => setPending(new Date(year, month, cell.day))}
              className={`history-calendar-day ${
                !cell.currentMonth ? "history-calendar-outside" : ""
              } ${isToday ? "history-calendar-today" : ""} ${
                isSelected ? "history-calendar-selected" : ""
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="history-calendar-footer">
        <button
          type="button"
          onClick={() => {
            onClear();
            onClose();
          }}
          className="history-calendar-clear"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!pending}
          onClick={() => {
            if (pending) onApply(localDateToString(pending));
            onClose();
          }}
          className="history-calendar-apply"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState<"from" | "to" | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const closePicker = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setOpen(null);
      }
    };
    document.addEventListener("mousedown", closePicker);
    return () => document.removeEventListener("mousedown", closePicker);
  }, []);

  return (
    <div ref={pickerRef} className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => (current === "from" ? null : "from"))}
        className={`history-date-button ${from ? "history-date-active" : ""}`}
      >
        <CalendarDays className="h-3 w-3" />
        {from ? dateParts(`${from}T00:00:00`).date : "From date"}
      </button>
      <span className="text-[11px] history-muted">→</span>
      <button
        type="button"
        onClick={() => setOpen((current) => (current === "to" ? null : "to"))}
        className={`history-date-button ${to ? "history-date-active" : ""}`}
      >
        <CalendarDays className="h-3 w-3" />
        {to ? dateParts(`${to}T00:00:00`).date : "To date"}
      </button>
      {open === "from" ? (
        <CustomCalendar
          value={from}
          onApply={(value) => onChange(value, to)}
          onClear={() => onChange("", to)}
          onClose={() => setOpen(null)}
        />
      ) : null}
      {open === "to" ? (
        <CustomCalendar
          value={to}
          onApply={(value) => onChange(from, value)}
          onClear={() => onChange(from, "")}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  footer,
  variant,
}: {
  label: string;
  value: number;
  footer: string;
  variant: "blue" | "green" | "red" | "amber";
}) {
  return (
    <div className={`history-stat-card history-stat-${variant}`}>
      <div className="history-stat-label">{label}</div>
      <div className={`history-stat-value history-stat-value-${variant}`}>{value}</div>
      <div className={`history-stat-footer ${variant === "red" ? "text-blue-400" : ""}`}>
        {footer}
      </div>
    </div>
  );
}

function DetailPanel({
  document,
  details,
  loading,
  error,
  onClose,
  onRetry,
  onOpen,
}: {
  document: HistoryDocument | null;
  details: DocumentDetails | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
  onOpen: () => void;
}) {
  if (!document) return null;
  const config = statusConfig(document.status);
  const accuracy = document.fields.total
    ? Math.round((document.fields.valid / document.fields.total) * 100)
    : 0;
  return (
    <>
      <div className="history-drawer-header">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-xs font-bold history-text">
            {document.awbNumber}
          </div>
          <div className="mt-0.5 text-[10px] history-muted">
            {document.action} · {dateParts(document.updatedAt).date}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close document details"
          onClick={onClose}
          className="history-close-button"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="history-drawer-body">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg history-card-bg" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            <div>{error}</div>
            <button type="button" onClick={onRetry} className="mt-3 font-semibold text-white">
              Retry
            </button>
          </div>
        ) : details ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`history-badge ${config.className}`}>
                <span className="h-1 w-1 rounded-full bg-current" />
                {config.label}
              </span>
              <span className="history-doc-tag">AWB</span>
              <span className="ml-auto text-[11px] history-muted">
                {formatBytes(document.fileSize)} · {document.pages}p
              </span>
            </div>

            {!details.history?.storagePath ? (
              <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-400">
                Source file is not stored yet.
              </div>
            ) : null}

            <section className="history-drawer-section">
              <h3 className="history-drawer-section-title">Extraction Summary</h3>
              <div className="history-summary-grid">
                <div className="history-summary-item">
                  <div className="font-mono text-lg font-bold text-emerald-400">
                    {document.fields.captured}/{document.fields.total}
                  </div>
                  <div className="history-summary-label">Fields</div>
                </div>
                <div className="history-summary-item">
                  <div className="font-mono text-lg font-bold text-blue-400">{document.pages}</div>
                  <div className="history-summary-label">Pages</div>
                </div>
                <div className="history-summary-item">
                  <div className="font-mono text-lg font-bold text-cyan-400">{accuracy}%</div>
                  <div className="history-summary-label">Accuracy</div>
                </div>
              </div>
            </section>

            <section className="history-drawer-section">
              <h3 className="history-drawer-section-title">Document Information</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["File", document.fileName],
                  ["Processed By", document.processedBy.name],
                  ["Run ID", document.runId || "Not available"],
                  ["Updated", formatDateTime(document.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="history-detail-tile">
                    <div className="text-[9px] uppercase history-muted">{label}</div>
                    <div className="mt-1 break-words text-[10px] font-semibold history-text2">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="history-drawer-section">
              <h3 className="history-drawer-section-title">Extracted Fields · AI Confidence</h3>
              {details.fields.map((field) => {
                const confidenceColor =
                  field.confidencePercent >= 95
                    ? "bg-emerald-400 text-emerald-400"
                    : field.confidencePercent >= 85
                      ? "bg-amber-400 text-amber-400"
                      : field.confidencePercent > 0
                        ? "bg-orange-400 text-orange-400"
                        : "bg-red-400 text-red-400";
                const [barColor, textColor] = confidenceColor.split(" ");
                return (
                  <div key={field.key} className="history-field-card">
                    <div className="text-[9px] uppercase tracking-wide history-muted">{field.label}</div>
                    <div
                      className={`mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] font-semibold ${
                        field.value ? "history-text" : "text-red-400"
                      }`}
                    >
                      {field.value || "Not extracted"}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-0.5 flex-1 overflow-hidden rounded history-track">
                        <div
                          className={`h-full rounded ${barColor}`}
                          style={{ width: `${field.confidencePercent}%` }}
                        />
                      </div>
                      <span className={`w-7 text-right font-mono text-[9px] ${textColor}`}>
                        {field.confidencePercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="history-drawer-section">
              <h3 className="history-drawer-section-title">Document Timeline</h3>
              {[
                {
                  label: "File Uploaded",
                  value: details.history?.createdAt || document.createdAt,
                  color: "bg-blue-400",
                },
                {
                  label: document.action,
                  value: details.history?.updatedAt || document.updatedAt,
                  color: document.status === "failed" ? "bg-red-400" : "bg-emerald-400",
                },
              ].map((item, index, timeline) => (
                <div key={item.label} className="mb-2 flex items-start gap-2.5">
                  <div
                    className={`relative mt-1 h-2 w-2 shrink-0 rounded-full ${item.color} ${
                      index !== timeline.length - 1
                        ? "after:absolute after:left-[3px] after:top-2 after:h-5 after:w-px after:bg-white/10"
                        : ""
                    }`}
                  />
                  <div>
                    <div className="text-[11px] font-semibold history-text2">{item.label}</div>
                    <div className="mt-0.5 font-mono text-[9px] history-muted">
                      {formatDateTime(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </div>

      <div className="history-drawer-actions">
        <button type="button" onClick={onOpen} className="history-drawer-primary">
          <ExternalLink className="h-3 w-3" />
          Open Document
        </button>
        <button
          type="button"
          disabled
          title="Final PDF download will be available after export is connected."
          className="history-drawer-secondary"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [allowed, setAllowed] = useState(false);
  const [scope, setScope] = useState<HistoryScope>("my");
  const [canViewCompanyHistory, setCanViewCompanyHistory] = useState(false);
  const [documents, setDocuments] = useState<HistoryDocument[]>([]);
  const [stats, setStats] = useState<HistoryStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [action, setAction] = useState("all");
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<HistoryDocument | null>(null);
  const [details, setDetails] = useState<DocumentDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let mounted = true;
    void fetchMemberships().then((result) => {
      if (!mounted) return;
      if (!result.ok) {
        if (result.status === 401 || result.status === 403) router.replace("/login");
        else setAllowed(true);
        return;
      }
      const accepted = (result.memberships || []).filter(
        (membership: { accepted_at?: string | null }) => membership.accepted_at
      );
      if (!selectedCompanyId && accepted.length === 1) {
        setSelectedCompanyId(accepted[0].company_id, true);
      }
      setAllowed(true);
    });
    return () => {
      mounted = false;
    };
  }, [router, selectedCompanyId, setSelectedCompanyId]);

  const loadHistory = useCallback(async () => {
    if (!allowed || !selectedCompanyId) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ companyId: selectedCompanyId, scope });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (action !== "all") params.set("action", action);
    if (range !== "all") params.set("range", range);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const response = await fetch(`/api/awb/history?${params.toString()}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(messageFromPayload(payload, "Unable to load AWB history."));
      }
      const data = payload.data as HistoryResponse;
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setStats(data.stats || EMPTY_STATS);
      setCanViewCompanyHistory(Boolean(data.canViewCompanyHistory));
      setChecked([]);
      setPage(1);
    } catch (loadError) {
      setDocuments([]);
      setStats(EMPTY_STATS);
      setError(loadError instanceof Error ? loadError.message : "Unable to load AWB history.");
    } finally {
      setLoading(false);
    }
  }, [action, allowed, from, range, scope, search, selectedCompanyId, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 250);
    return () => window.clearTimeout(timer);
  }, [loadHistory, refreshKey]);

  const loadDetails = useCallback(async (document: HistoryDocument) => {
    setSelected(document);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/awb/documents/${document.id}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(messageFromPayload(payload, "Unable to load AWB document."));
      }
      setDetails(payload.data as DocumentDetails);
    } catch (loadError) {
      setDetailsError(
        loadError instanceof Error ? loadError.message : "Unable to load AWB document."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const sortedDocuments = useMemo(() => {
    const valueFor = (document: HistoryDocument) => {
      if (sortKey === "fields") return document.fields.captured;
      if (sortKey === "processedBy") return document.processedBy.name;
      return document[sortKey];
    };
    return [...documents].sort((left, right) => {
      const a = valueFor(left);
      const b = valueFor(right);
      if (typeof a === "number" && typeof b === "number") {
        return sortDirection === "asc" ? a - b : b - a;
      }
      const result = String(a).localeCompare(String(b));
      return sortDirection === "asc" ? result : -result;
    });
  }, [documents, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedDocuments.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = sortedDocuments.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setAction("all");
    setRange("all");
    setFrom("");
    setTo("");
    setChecked([]);
  };

  const exportCsv = () => {
    if (!documents.length) return;
    const rows = [
      ["Date", "AWB Number", "Action", "File", "Fields", "Processed By", "Status"],
      ...documents.map((document) => [
        formatDateTime(document.createdAt),
        document.awbNumber,
        document.action,
        document.fileName,
        `${document.fields.captured}/${document.fields.total}`,
        document.processedBy.name,
        document.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `semlox-awb-history-${scope}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleChecked = (id: string) => {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const togglePage = () => {
    const pageIds = paginated.map((document) => document.id);
    const allChecked = pageIds.length > 0 && pageIds.every((id) => checked.includes(id));
    setChecked((current) =>
      allChecked
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds]))
    );
  };

  if (!allowed) {
    return (
      <main className="flex h-full items-center justify-center bg-[#04060f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
      </main>
    );
  }

  return (
    <main className="history-page flex h-full min-h-0 overflow-hidden">
      <div className="history-main min-w-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-bold tracking-[-0.03em] history-text">
                Activity History
              </h1>
              <p className="mt-1 text-xs history-muted">
                Track generated, updated, and finalized AWBs · All document actions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="history-total-chip">Total: {documents.length}</div>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="history-pill-button"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
              {checked.length ? (
                <div className="history-pill-button history-pill-primary">
                  <Check className="h-3 w-3" />
                  {checked.length} selected
                </div>
              ) : null}
              <button
                type="button"
                onClick={clearFilters}
                className="history-pill-button history-pill-danger"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!documents.length}
                className="history-pill-button disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-3 w-3" />
                Export CSV
              </button>
            </div>
          </div>

          {canViewCompanyHistory ? (
            <div className="inline-flex w-fit rounded-lg border history-border history-card-bg p-0.5">
              {([
                ["my", "My History"],
                ["company", "Company History"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setScope(value);
                    setSelected(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                    scope === value
                      ? "bg-blue-500 text-white"
                      : "history-muted hover:text-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Documents"
              value={stats.totalDocuments}
              footer="All time · all actions"
              variant="blue"
            />
            <StatCard
              label="Successful"
              value={stats.successful}
              footer="Issued + extracted"
              variant="green"
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              footer="View & re-process"
              variant="red"
            />
            <StatCard
              label="Draft Saves"
              value={stats.drafts}
              footer="Pending completion"
              variant="amber"
            />
          </div>

          <div className="history-filter-bar">
            <label className="history-search-input">
              <Search className="h-3.5 w-3.5 history-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by AWB #, action, user..."
              />
            </label>
            <div className="history-filter-divider" />
            <DateRangePicker
              from={from}
              to={to}
              onChange={(nextFrom, nextTo) => {
                setFrom(nextFrom);
                setTo(nextTo);
              }}
            />
            <div className="history-filter-divider" />
            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All time"],
                ["today", "Today"],
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={`history-quick-pill ${range === value ? "history-quick-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="history-filter-divider" />
            <div className="flex gap-1.5">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="history-select"
              >
                <option value="all">All Status</option>
                <option value="uploaded">Uploaded</option>
                <option value="extracting">Processing</option>
                <option value="review_required">Partial</option>
                <option value="ready_to_issue">Ready to Issue</option>
                <option value="draft">Draft</option>
                <option value="issued">AWB Issued</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="history-select"
              >
                <option value="all">All Actions</option>
                <option value="Initial Extraction">Initial Extraction</option>
                <option value="Draft Saved">Draft Saved</option>
                <option value="Issued AWB">Issued AWB</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="history-table-card">
            <div className="history-table-top">
              <span className="text-[13px] font-semibold history-text">Documents</span>
              <span className="history-table-count">{documents.length} records</span>
              {checked.length ? (
                <span className="ml-1 font-mono text-[11px] text-blue-400">
                  {checked.length} selected
                </span>
              ) : null}
              <div className="ml-auto flex gap-1.5">
                {checked.length ? (
                  <>
                    <button type="button" disabled className="history-table-button text-blue-400">
                      Re-process
                    </button>
                    <button type="button" disabled className="history-table-button">
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecked([])}
                      className="history-table-button history-table-danger"
                    >
                      Deselect
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="history-table-button">
                      <Columns3 className="h-3 w-3" />
                      Columns
                    </button>
                    <button type="button" onClick={exportCsv} className="history-table-button">
                      <Download className="h-3 w-3" />
                      Export
                    </button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded history-card-bg" />
                ))}
              </div>
            ) : error ? (
              <div className="p-10 text-center">
                <div className="text-xs font-semibold text-red-400">{error}</div>
                <button
                  type="button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  className="mt-3 text-xs font-semibold text-blue-400"
                >
                  Retry
                </button>
              </div>
            ) : !documents.length ? (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <FileText className="h-7 w-7 history-faint" />
                <div className="mt-3 text-xs font-semibold history-text2">
                  No AWB history found.
                </div>
                <div className="mt-1 text-[10px] history-muted">
                  Upload or process an AWB to create history.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="history-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="w-9 px-4">
                        <Checkbox
                          checked={
                            paginated.length > 0 &&
                            paginated.every((document) => checked.includes(document.id))
                          }
                          onClick={togglePage}
                          label="Select page"
                        />
                      </th>
                      {([
                        ["createdAt", "Date"],
                        ["awbNumber", "AWB Number"],
                        ["action", "Action"],
                        [null, "Type"],
                        ["fields", "Fields"],
                        ["processedBy", "Processed By"],
                        ["status", "Status"],
                      ] as Array<[SortKey | null, string]>).map(([key, label]) => (
                        <th
                          key={label}
                          onClick={() => key && handleSort(key)}
                          className={key ? "cursor-pointer" : ""}
                        >
                          {label}
                          {key ? (
                            <span className="ml-1 text-[9px] opacity-40">
                              {sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                            </span>
                          ) : null}
                        </th>
                      ))}
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((document) => {
                      const config = statusConfig(document.status);
                      const date = dateParts(document.createdAt);
                      const fieldColor =
                        document.fields.captured === document.fields.total
                          ? "text-emerald-400 bg-emerald-400"
                          : document.fields.captured === 0
                            ? "text-red-400 bg-red-400"
                            : "text-amber-400 bg-amber-400";
                      const [fieldText, fieldBackground] = fieldColor.split(" ");
                      const progress = document.fields.total
                        ? (document.fields.captured / document.fields.total) * 100
                        : 0;
                      const selectedRow = selected?.id === document.id;
                      return (
                        <tr
                          key={document.id}
                          className={selectedRow ? "history-row-selected" : ""}
                          onClick={() =>
                            selectedRow
                              ? setSelected(null)
                              : void loadDetails(document)
                          }
                        >
                          <td
                            className="px-4"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleChecked(document.id);
                            }}
                          >
                            <Checkbox
                              checked={checked.includes(document.id)}
                              onClick={() => toggleChecked(document.id)}
                              label={`Select ${document.awbNumber}`}
                            />
                          </td>
                          <td>
                            <div className="whitespace-nowrap font-mono text-[10px] font-semibold history-text">
                              {date.date}
                            </div>
                            <div className="mt-px font-mono text-[9px] history-muted">
                              {date.time}
                            </div>
                          </td>
                          <td>
                            <span className="font-mono text-[11px] font-bold history-text">
                              {document.awbNumber}
                            </span>
                          </td>
                          <td>
                            <span className={`text-xs font-medium ${actionColor(document.action)}`}>
                              {document.action}
                            </span>
                          </td>
                          <td>
                            <span className="history-doc-tag">AWB</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-[11px] font-bold ${fieldText}`}>
                                {document.fields.captured}/{document.fields.total}
                              </span>
                              <div className="h-[3px] w-[52px] overflow-hidden rounded history-track">
                                <div
                                  className={`h-full rounded ${fieldBackground}`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="history-user-avatar">
                                {initials(document.processedBy.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs history-text2">
                                  {document.processedBy.name}
                                </div>
                                {document.processedBy.email &&
                                document.processedBy.email !== document.processedBy.name ? (
                                  <div className="truncate text-[9px] history-muted">
                                    {document.processedBy.email}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`history-badge ${config.className}`}>
                              <span className="h-1 w-1 rounded-full bg-current" />
                              {config.label}
                            </span>
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => void loadDetails(document)}
                              className="history-open-button"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="history-pagination">
              <div className="font-mono text-[11px] history-muted">
                Showing{" "}
                {documents.length === 0 ? 0 : (currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, documents.length)} of {documents.length}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="history-page-button"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map(
                  (number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setPage(number)}
                      className={`history-page-button ${
                        currentPage === number ? "history-page-active" : ""
                      }`}
                    >
                      {number}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="history-page-button"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="flex items-center gap-2 text-[11px] history-muted">
                Rows per page:
                <select
                  value={perPage}
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                  className="history-page-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <aside className={`history-detail-drawer ${selected ? "history-detail-open" : ""}`}>
        <DetailPanel
          document={selected}
          details={details}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => {
            setSelected(null);
            setDetails(null);
          }}
          onRetry={() => {
            if (selected) void loadDetails(selected);
          }}
          onOpen={() => {
            if (selected) router.push(`/dashboard/awb?documentId=${selected.id}`);
          }}
        />
      </aside>

      <style jsx global>{`
        .history-page {
          --history-bg: #04060f;
          --history-card: rgba(255, 255, 255, 0.03);
          --history-card-border: rgba(255, 255, 255, 0.08);
          --history-card-hover: rgba(255, 255, 255, 0.055);
          --history-text: #f1f5f9;
          --history-text2: #cbd5e1;
          --history-muted: #64748b;
          --history-faint: #1e293b;
          --history-input: rgba(255, 255, 255, 0.04);
          --history-input-border: rgba(255, 255, 255, 0.1);
          --history-row-hover: rgba(255, 255, 255, 0.025);
          --history-row-selected: rgba(59, 130, 246, 0.07);
          --history-table-head: rgba(255, 255, 255, 0.02);
          --history-divider: rgba(255, 255, 255, 0.06);
          background: var(--history-bg);
          color: var(--history-text);
        }
        .dashboard-theme-light .history-page {
          --history-bg: #f1f5f9;
          --history-card: #ffffff;
          --history-card-border: rgba(0, 0, 0, 0.08);
          --history-card-hover: #f8fafc;
          --history-text: #0f172a;
          --history-text2: #1e293b;
          --history-muted: #64748b;
          --history-faint: #e2e8f0;
          --history-input: #ffffff;
          --history-input-border: rgba(0, 0, 0, 0.1);
          --history-row-hover: rgba(59, 130, 246, 0.03);
          --history-row-selected: rgba(59, 130, 246, 0.06);
          --history-table-head: #f8fafc;
          --history-divider: rgba(0, 0, 0, 0.07);
        }
        .history-main {
          scrollbar-width: thin;
          scrollbar-color: var(--history-faint) transparent;
        }
        .history-text { color: var(--history-text); }
        .history-text2 { color: var(--history-text2); }
        .history-muted { color: var(--history-muted); }
        .history-faint { color: var(--history-faint); }
        .history-border { border-color: var(--history-card-border); }
        .history-card-bg { background: var(--history-card); }
        .history-track { background: var(--history-faint); }
        .history-total-chip,
        .history-pill-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 31px;
          padding: 7px 14px;
          border-radius: 20px;
          border: 1px solid var(--history-card-border);
          background: var(--history-card);
          color: var(--history-muted);
          font-size: 12px;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .history-total-chip {
          color: var(--history-text2);
          font-family: monospace;
          font-weight: 700;
        }
        .history-pill-button:hover {
          border-color: rgba(59, 130, 246, 0.3);
          background: var(--history-card-hover);
          color: var(--history-text2);
        }
        .history-pill-danger:hover { border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }
        .history-pill-primary { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .history-stat-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--history-card-border);
          border-radius: 12px;
          background: var(--history-card);
          padding: 16px 18px;
          transition: all 0.2s;
        }
        .history-stat-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 2px; }
        .history-stat-blue::before { background: linear-gradient(90deg, #3b82f6, #06b6d4); }
        .history-stat-green::before { background: linear-gradient(90deg, #10b981, #06b6d4); }
        .history-stat-red::before { background: linear-gradient(90deg, #ef4444, #f97316); }
        .history-stat-amber::before { background: linear-gradient(90deg, #f59e0b, #f97316); }
        .history-stat-card:hover { transform: translateY(-1px); border-color: rgba(59, 130, 246, 0.25); }
        .history-stat-label { margin-bottom: 8px; color: var(--history-muted); font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
        .history-stat-value { margin-bottom: 6px; font-family: monospace; font-size: 30px; font-weight: 700; line-height: 1; letter-spacing: -0.04em; }
        .history-stat-value-blue { color: #3b82f6; }
        .history-stat-value-green { color: #10b981; }
        .history-stat-value-red { color: #ef4444; }
        .history-stat-value-amber { color: #f59e0b; }
        .history-stat-footer { color: var(--history-muted); font-size: 10px; }
        .history-filter-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          border: 1px solid var(--history-card-border);
          border-radius: 12px;
          background: var(--history-card);
          padding: 12px 16px;
        }
        .history-filter-divider { width: 1px; height: 26px; background: var(--history-divider); }
        .history-search-input {
          display: flex;
          min-width: 220px;
          max-width: 280px;
          flex: 1;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--history-input-border);
          border-radius: 8px;
          background: var(--history-input);
          padding: 7px 12px;
        }
        .history-search-input:focus-within { border-color: rgba(59, 130, 246, 0.4); }
        .history-search-input input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--history-text); font-size: 12px; }
        .history-date-button {
          position: relative;
          display: flex;
          min-width: 104px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid var(--history-input-border);
          border-radius: 8px;
          background: var(--history-input);
          padding: 7px 12px;
          color: var(--history-text2);
          font-size: 12px;
          white-space: nowrap;
          cursor: pointer;
        }
        .history-date-button:hover { border-color: rgba(59, 130, 246, 0.3); }
        .history-date-active { border-color: rgba(59, 130, 246, 0.3); color: #3b82f6; }
        .history-calendar-popup {
          position: absolute;
          left: 0;
          top: calc(100% + 8px);
          z-index: 100;
          width: 300px;
          border: 1px solid rgba(59, 130, 246, 0.24);
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.99);
          padding: 16px;
          color: #f1f5f9;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(14px);
        }
        .dashboard-theme-light .history-calendar-popup {
          border-color: rgba(59, 130, 246, 0.2);
          background: rgba(255, 255, 255, 0.99);
          color: #0f172a;
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.2);
        }
        .history-calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .history-calendar-nav {
          display: flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          color: #64748b;
          transition: all 0.15s;
        }
        .dashboard-theme-light .history-calendar-nav {
          border-color: rgba(15, 23, 42, 0.1);
          background: #f8fafc;
        }
        .history-calendar-nav:hover {
          border-color: rgba(59, 130, 246, 0.4);
          color: #3b82f6;
        }
        .history-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .history-calendar-weekday {
          padding: 4px 0;
          color: #64748b;
          font-family: monospace;
          font-size: 10px;
          text-align: center;
          letter-spacing: 0.05em;
        }
        .history-calendar-day {
          display: flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #cbd5e1;
          font-size: 12px;
          transition: all 0.12s;
        }
        .dashboard-theme-light .history-calendar-day { color: #334155; }
        .history-calendar-day:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }
        .history-calendar-outside {
          cursor: default;
          color: #334155;
          opacity: 0.45;
        }
        .dashboard-theme-light .history-calendar-outside { color: #94a3b8; }
        .history-calendar-today {
          border-color: rgba(59, 130, 246, 0.5);
          color: #60a5fa;
          font-weight: 700;
        }
        .history-calendar-selected,
        .history-calendar-selected:hover:not(:disabled) {
          border-color: #3b82f6;
          background: #3b82f6;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 5px 16px rgba(59, 130, 246, 0.32);
        }
        .history-calendar-footer {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 14px;
        }
        .dashboard-theme-light .history-calendar-footer {
          border-color: rgba(15, 23, 42, 0.08);
        }
        .history-calendar-clear,
        .history-calendar-apply {
          flex: 1;
          border-radius: 8px;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .history-calendar-clear {
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94a3b8;
        }
        .dashboard-theme-light .history-calendar-clear {
          border-color: rgba(15, 23, 42, 0.12);
          color: #64748b;
        }
        .history-calendar-clear:hover {
          border-color: rgba(59, 130, 246, 0.35);
          color: #cbd5e1;
        }
        .history-calendar-apply {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: #ffffff;
        }
        .history-calendar-apply:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }
        .history-quick-pill {
          border: 1px solid var(--history-input-border);
          border-radius: 7px;
          padding: 6px 12px;
          color: var(--history-muted);
          font-size: 12px;
          white-space: nowrap;
        }
        .history-quick-pill:hover { border-color: rgba(59, 130, 246, 0.3); color: var(--history-text2); }
        .history-quick-active { border-color: rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.1); color: #3b82f6; font-weight: 600; }
        .history-select,
        .history-page-select {
          border: 1px solid var(--history-input-border);
          border-radius: 8px;
          background: var(--history-input);
          color: var(--history-text2);
          padding: 7px 10px;
          font-size: 12px;
          outline: 0;
        }
        .history-select option,
        .history-page-select option { background: var(--history-bg); color: var(--history-text); }
        .history-table-card { overflow: hidden; border: 1px solid var(--history-card-border); border-radius: 14px; background: var(--history-card); }
        .history-table-top { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--history-divider); padding: 14px 18px; }
        .history-table-count { border-radius: 5px; background: rgba(59, 130, 246, 0.1); padding: 2px 8px; color: #3b82f6; font-family: monospace; font-size: 11px; }
        .history-table-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 1px solid var(--history-card-border);
          border-radius: 7px;
          background: var(--history-card);
          padding: 5px 12px;
          color: var(--history-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .history-table-button:hover { border-color: rgba(59, 130, 246, 0.3); color: #3b82f6; }
        .history-table-danger:hover { border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table th { border-bottom: 1px solid var(--history-divider); background: var(--history-table-head); padding: 10px 14px; color: var(--history-muted); font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
        .history-table td { border-bottom: 1px solid var(--history-divider); padding: 11px 14px; color: var(--history-text2); font-size: 12px; vertical-align: middle; }
        .history-table tbody tr:hover td { cursor: pointer; background: var(--history-row-hover); }
        .history-table tbody tr.history-row-selected td { background: var(--history-row-selected); }
        .history-check { display: flex; width: 15px; height: 15px; flex-shrink: 0; align-items: center; justify-content: center; border: 1.5px solid var(--history-input-border); border-radius: 3px; background: var(--history-input); color: white; }
        .history-check-on { border-color: #3b82f6; background: #3b82f6; }
        .history-doc-tag { display: inline-flex; align-items: center; border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 5px; background: rgba(59, 130, 246, 0.08); padding: 3px 8px; color: #3b82f6; font-family: monospace; font-size: 10px; font-weight: 700; }
        .history-user-avatar { display: flex; width: 22px; height: 22px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 8px; font-weight: 700; }
        .history-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; padding: 3px 9px; font-size: 10px; font-weight: 600; white-space: nowrap; }
        .history-b-ok { border: 1px solid rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.12); color: #10b981; }
        .history-b-issued { border: 1px solid rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
        .history-b-draft { border: 1px solid rgba(245, 158, 11, 0.2); background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
        .history-b-partial { border: 1px solid rgba(249, 115, 22, 0.2); background: rgba(249, 115, 22, 0.12); color: #f97316; }
        .history-b-fail { border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .history-b-neutral { border: 1px solid var(--history-card-border); background: var(--history-card); color: var(--history-muted); }
        .history-open-button { display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 7px; background: rgba(59, 130, 246, 0.08); padding: 5px 12px; color: #3b82f6; font-size: 11px; font-weight: 600; }
        .history-open-button:hover { border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.18); }
        .history-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--history-divider); padding: 12px 18px; }
        .history-page-button { display: flex; width: 30px; height: 30px; align-items: center; justify-content: center; border: 1px solid var(--history-card-border); border-radius: 6px; background: var(--history-card); color: var(--history-muted); font-size: 12px; }
        .history-page-button:hover:not(:disabled) { border-color: rgba(59, 130, 246, 0.3); color: var(--history-text2); }
        .history-page-button:disabled { cursor: not-allowed; opacity: 0.3; }
        .history-page-active { border-color: rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.1); color: #3b82f6; font-weight: 700; }
        .history-detail-drawer { width: 0; flex-shrink: 0; overflow: hidden; border-left: 0 solid var(--history-card-border); background: var(--history-card); transition: width 0.3s ease, border-width 0.3s ease; }
        .history-detail-open { width: 380px; border-left-width: 1px; }
        .history-drawer-header { display: flex; height: 60px; align-items: center; gap: 10px; border-bottom: 1px solid var(--history-divider); padding: 0 18px; }
        .history-close-button { display: flex; width: 26px; height: 26px; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid var(--history-card-border); border-radius: 6px; background: var(--history-card); color: var(--history-muted); }
        .history-close-button:hover { border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }
        .history-drawer-body { height: calc(100% - 116px); overflow-y: auto; padding: 16px; scrollbar-width: thin; scrollbar-color: var(--history-faint) transparent; }
        .history-drawer-section { margin-bottom: 18px; }
        .history-drawer-section-title { margin-bottom: 10px; color: var(--history-muted); font-family: monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.8; }
        .history-summary-grid { display: flex; overflow: hidden; border: 1px solid var(--history-card-border); border-radius: 10px; }
        .history-summary-item { flex: 1; border-right: 1px solid var(--history-card-border); padding: 12px; text-align: center; }
        .history-summary-item:last-child { border-right: 0; }
        .history-summary-label { color: var(--history-muted); font-size: 9px; letter-spacing: 0.04em; }
        .history-detail-tile,
        .history-field-card { border: 1px solid var(--history-card-border); border-radius: 8px; background: var(--history-card); padding: 10px 12px; }
        .history-field-card { margin-bottom: 6px; }
        .history-drawer-actions { display: flex; height: 56px; gap: 8px; border-top: 1px solid var(--history-divider); padding: 10px 16px; }
        .history-drawer-primary,
        .history-drawer-secondary { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; padding: 10px; font-size: 12px; font-weight: 600; }
        .history-drawer-primary { background: linear-gradient(135deg, #3b82f6, #06b6d4); color: white; }
        .history-drawer-secondary { border: 1px solid var(--history-card-border); color: var(--history-muted); }
        .history-drawer-secondary:disabled { cursor: not-allowed; opacity: 0.6; }
        @media (max-width: 1100px) {
          .history-detail-open { position: absolute; inset: 0 0 0 auto; z-index: 30; width: min(380px, 92vw); box-shadow: -20px 0 60px rgba(0, 0, 0, 0.4); }
        }
        @media (max-width: 767px) {
          .history-main { padding: 16px; }
          .history-filter-divider { display: none; }
          .history-search-input { max-width: none; width: 100%; }
        }
      `}</style>
    </main>
  );
}
