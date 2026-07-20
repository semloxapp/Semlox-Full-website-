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
import {
  EMPTY_HISTORY_STATS,
  type HistoryDocument,
  type HistoryScope,
  type HistoryStats,
  type HistoryStatus,
  useAwbHistory,
} from "../../hooks/queries/useAwbHistory";
import { membershipErrorStatus, useMemberships } from "../../hooks/queries/useMemberships";
import { getAcceptedMemberships } from "../../utils/membership";
import type { AwbExtractionResponse } from "@/lib/awb/types";
import { Badge, type BadgeProps } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";

type SortKey = "createdAt" | "awbNumber" | "action" | "fields" | "processedBy" | "status";
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

function formatQualityPercent(value: number | null) {
  return value === null ? "N/A" : `${Math.round(value)}%`;
}

function statusConfig(
  status: HistoryStatus,
): { label: string; variant: BadgeProps["variant"] } {
  if (status === "issued") return { label: "AWB Issued", variant: "info" };
  if (status === "ready_to_issue") return { label: "Ready to Issue", variant: "success" };
  if (status === "draft") return { label: "Draft Saved", variant: "neutral" };
  if (status === "review_required") return { label: "Partial", variant: "warning" };
  if (status === "failed") return { label: "Failed", variant: "danger" };
  return {
    label: status === "extracting" ? "Processing" : "Uploaded",
    variant: "neutral",
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
        <div className="semlox-section-title">
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
      <Button
        variant={from ? "solid" : "outline"}
        onClick={() => setOpen((current) => (current === "from" ? null : "from"))}
        className="history-date-button"
      >
        <CalendarDays className="h-3 w-3" />
        {from ? dateParts(`${from}T00:00:00`).date : "From date"}
      </Button>
      <span className="semlox-table-body">→</span>
      <Button
        variant={to ? "solid" : "outline"}
        onClick={() => setOpen((current) => (current === "to" ? null : "to"))}
        className="history-date-button"
      >
        <CalendarDays className="h-3 w-3" />
        {to ? dateParts(`${to}T00:00:00`).date : "To date"}
      </Button>
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
    <Card className={`history-stat-card history-stat-${variant}`}>
      <div className="semlox-kpi-label history-stat-label">{label}</div>
      <div className={`semlox-kpi-value history-stat-value history-stat-value-${variant}`}>{value}</div>
      <div className="semlox-kpi-description history-stat-footer">
        {footer}
      </div>
    </Card>
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
  return (
    <>
      <div className="history-drawer-header">
        <div className="min-w-0 flex-1">
          <div className="semlox-identifier truncate font-mono">
            {document.awbNumber}
          </div>
          <div className="semlox-metadata mt-0.5">
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
          <div className="semlox-body rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <div>{error}</div>
            <Button type="button" onClick={onRetry} variant="danger" size="compact" className="mt-3">
              Retry
            </Button>
          </div>
        ) : details ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant={config.variant}>
                <span className="h-1 w-1 rounded-full bg-current" />
                {config.label}
              </Badge>
              <span className="history-doc-tag">AWB</span>
              <span className="semlox-metadata ml-auto">
                {formatBytes(document.fileSize)} · {document.pages}p
              </span>
            </div>

            {!details.history?.storagePath ? (
              <div className="semlox-label mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-400">
                Source file is not stored yet.
              </div>
            ) : null}

            <section className="history-drawer-section">
              <h3 className="semlox-label history-drawer-section-title">Extraction Summary</h3>
              <div className="history-summary-grid">
                <div className="history-summary-item">
                  <div className="text-lg font-bold text-emerald-400">
                    {document.fields.captured}/{document.fields.total}
                  </div>
                  <div className="semlox-metadata history-summary-label">Fields</div>
                </div>
                <div className="history-summary-item">
                  <div className="text-lg font-bold text-blue-400">{document.pages}</div>
                  <div className="semlox-metadata history-summary-label">Pages</div>
                </div>
                <div className="history-summary-item">
                  <div className="text-lg font-bold text-cyan-400">
                    {formatQualityPercent(details.quality.finalFieldAccuracyPercent)}
                  </div>
                  <div className="semlox-metadata history-summary-label">
                    {document.status === "issued"
                      ? "Final Field Accuracy"
                      : "Current Field Accuracy"}
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  [
                    "Average AI Confidence",
                    formatQualityPercent(details.quality.averageAiConfidencePercent),
                  ],
                  [
                    document.status === "issued"
                      ? "Final Correction Rate"
                      : "Current Correction Rate",
                    formatQualityPercent(details.quality.correctionRatePercent),
                  ],
                  ["Corrected Fields", String(details.quality.correctedFieldsCount)],
                  ["Evaluated Fields", String(details.quality.evaluatedFieldsCount)],
                ].map(([label, value]) => (
                  <div key={label} className="history-detail-tile">
                    <div className="semlox-metadata uppercase">{label}</div>
                    <div className="semlox-table-body mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="history-drawer-section">
              <h3 className="semlox-label history-drawer-section-title">Document Information</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["File", document.fileName],
                  ["Processed By", document.processedBy.name],
                  ["Run ID", document.runId || "Not available"],
                  ["Updated", formatDateTime(document.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="history-detail-tile">
                    <div className="semlox-metadata uppercase">{label}</div>
                    <div className="semlox-table-body mt-1 break-words">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="history-drawer-section">
              <h3 className="semlox-label history-drawer-section-title">Extracted Fields · AI Confidence</h3>
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
                    <div className="semlox-metadata uppercase tracking-wide">{field.label}</div>
                    <div
                      className={`semlox-identifier mt-0.5 whitespace-pre-wrap break-words ${
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
                      <span className={`w-7 text-right text-[9px] ${textColor}`}>
                        {field.confidencePercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="history-drawer-section">
              <h3 className="semlox-label history-drawer-section-title">Document Timeline</h3>
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
                    <div className="semlox-table-body">{item.label}</div>
                    <div className="semlox-metadata mt-0.5 font-mono">
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
        <Button type="button" onClick={onOpen} variant="primary" className="flex-1">
          <ExternalLink className="h-3 w-3" />
          Open Document
        </Button>
        <Button
          type="button"
          disabled
          title="Final PDF download will be available after export is connected."
          variant="secondary"
          className="flex-1"
        >
          <Download className="h-3 w-3" />
          Download
        </Button>
      </div>
    </>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [allowed, setAllowed] = useState(false);
  const [scope, setScope] = useState<HistoryScope>("my");
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
  const membershipsQuery = useMemberships();
  const historyQuery = useAwbHistory(
    { companyId: selectedCompanyId, scope, search, status, action, range, from, to },
    { enabled: allowed }
  );
  const historyData = historyQuery.data;
  const documents = useMemo(() => historyData?.documents || [], [historyData?.documents]);
  const stats: HistoryStats = historyData?.stats || EMPTY_HISTORY_STATS;
  const canViewCompanyHistory = Boolean(historyData?.canViewCompanyHistory);

  useEffect(() => {
    if (membershipsQuery.isPending) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (membershipsQuery.isError) {
        const status = membershipErrorStatus(membershipsQuery.error);
        if (status === 401 || status === 403) router.replace("/login");
        else setAllowed(true);
        return;
      }
      const accepted = getAcceptedMemberships(membershipsQuery.data);
      if (!selectedCompanyId && accepted.length === 1) {
        setSelectedCompanyId(accepted[0].company_id, true);
      }
      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    membershipsQuery.data,
    membershipsQuery.error,
    membershipsQuery.isError,
    membershipsQuery.isPending,
    router,
    selectedCompanyId,
    setSelectedCompanyId,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      setChecked([]);
      setPage(1);
    });
  }, [action, from, range, scope, search, status, to]);

  const loadDetails = useCallback(async (document: HistoryDocument) => {
    setSelected(document);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/awb/documents/${document.id}`, {
        credentials: "include",
        cache: "no-store",
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
          <PageHeader
            title="Activity History"
            description="Track generated, updated, and finalized AWBs · All document actions"
            actions={
              <>
                <Badge variant="neutral">Total: {documents.length}</Badge>
                <Button
                  onClick={() => void historyQuery.refetch()}
                  disabled={historyQuery.isFetching}
                  variant="secondary"
                >
                  <RefreshCw className={`h-3 w-3 ${historyQuery.isFetching ? "animate-spin" : ""}`} />
                  {historyQuery.isFetching ? "Refreshing" : "Refresh"}
                </Button>
                {checked.length ? (
                  <Badge variant="info">
                    <Check className="h-3 w-3" />
                    {checked.length} selected
                  </Badge>
                ) : null}
                <Button onClick={clearFilters} variant="outline">
                  <X className="h-3 w-3" />
                  Clear
                </Button>
                <Button onClick={exportCsv} disabled={!documents.length} variant="secondary">
                  <Download className="h-3 w-3" />
                  Export CSV
                </Button>
              </>
            }
          />

          {canViewCompanyHistory ? (
            <div className="inline-flex w-fit rounded-[var(--semlox-radius-control)] border history-border history-card-bg p-0.5">
              {([
                ["my", "My History"],
                ["company", "Company History"],
              ] as const).map(([value, label]) => (
                <Button
                  key={value}
                  onClick={() => {
                    setScope(value);
                    setSelected(null);
                  }}
                  size="toggle"
                  variant={scope === value ? "solid" : "ghost"}
                >
                  {label}
                </Button>
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

          <Card className="history-filter-bar">
            <div className="relative min-w-[220px] max-w-[280px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 history-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by AWB #, action, user..."
                className="pl-9"
              />
            </div>
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
                <Button
                  key={value}
                  onClick={() => setRange(value)}
                  size="compact"
                  variant={range === value ? "solid" : "secondary"}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="history-filter-divider" />
            <div className="flex gap-1.5">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All Status</option>
                <option value="uploaded">Uploaded</option>
                <option value="extracting">Processing</option>
                <option value="review_required">Partial</option>
                <option value="ready_to_issue">Ready to Issue</option>
                <option value="draft">Draft</option>
                <option value="issued">AWB Issued</option>
                <option value="failed">Failed</option>
              </Select>
              <Select
                value={action}
                onChange={(event) => setAction(event.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="Initial Extraction">Initial Extraction</option>
                <option value="Draft Saved">Draft Saved</option>
                <option value="Issued AWB">Issued AWB</option>
                <option value="Failed">Failed</option>
              </Select>
            </div>
          </Card>

          <Card className="history-table-card">
            <div className="history-table-top">
              <span className="semlox-section-title">Documents</span>
              <Badge variant="info">{documents.length} records</Badge>
              {checked.length ? (
                <span className="semlox-link ml-1">
                  {checked.length} selected
                </span>
              ) : null}
              <div className="ml-auto flex gap-1.5">
                {checked.length ? (
                  <>
                    <Button disabled size="compact" variant="secondary">
                      Re-process
                    </Button>
                    <Button disabled size="compact" variant="secondary">
                      Download
                    </Button>
                    <Button
                      onClick={() => setChecked([])}
                      size="compact"
                      variant="danger"
                    >
                      Deselect
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="compact" variant="secondary">
                      <Columns3 className="h-3 w-3" />
                      Columns
                    </Button>
                    <Button size="compact" variant="secondary" onClick={exportCsv}>
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  </>
                )}
              </div>
            </div>

            {historyQuery.isPending && !historyData ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded history-card-bg" />
                ))}
              </div>
            ) : historyQuery.error && !historyData ? (
              <div className="p-10 text-center">
                <div className="semlox-section-title text-red-400">{historyQuery.error.message}</div>
                <Button
                  onClick={() => void historyQuery.refetch()}
                  size="compact"
                  variant="ghost"
                  className="mt-3"
                >
                  Retry
                </Button>
              </div>
            ) : !documents.length ? (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <FileText className="h-7 w-7 history-faint" />
                <div className="semlox-table-body mt-3">
                  No AWB history found.
                </div>
                <div className="semlox-metadata mt-1">
                  Upload or process an AWB to create history.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="semlox-table-body history-table min-w-[900px]">
                  <thead className="semlox-table-header">
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
                            <div className="semlox-identifier whitespace-nowrap font-mono">
                              {date.date}
                            </div>
                            <div className="semlox-metadata mt-px font-mono">
                              {date.time}
                            </div>
                          </td>
                          <td>
                            <span className="semlox-identifier">
                              {document.awbNumber}
                            </span>
                          </td>
                          <td>
                            <span className={`semlox-table-body ${actionColor(document.action)}`}>
                              {document.action}
                            </span>
                          </td>
                          <td>
                            <span className="history-doc-tag">AWB</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={`semlox-identifier ${fieldText}`}>
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
                                <div className="semlox-table-body truncate">
                                  {document.processedBy.name}
                                </div>
                                {document.processedBy.email &&
                                document.processedBy.email !== document.processedBy.name ? (
                                  <div className="semlox-metadata truncate">
                                    {document.processedBy.email}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge variant={config.variant}>
                              <span className="h-1 w-1 rounded-full bg-current" />
                              {config.label}
                            </Badge>
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <Button
                              onClick={() => void loadDetails(document)}
                              size="compact"
                              variant="compactAction"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="history-pagination">
              <div className="semlox-table-body">
                Showing{" "}
                {documents.length === 0 ? 0 : (currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, documents.length)} of {documents.length}
              </div>
              <div className="flex gap-1">
                <Button
                  size="compact"
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="history-page-button"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map(
                  (number) => (
                    <Button
                      key={number}
                      size="compact"
                      variant={currentPage === number ? "solid" : "secondary"}
                      onClick={() => setPage(number)}
                      className="history-page-button"
                    >
                      {number}
                    </Button>
                  )
                )}
                <Button
                  size="compact"
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="history-page-button"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <label className="semlox-table-body flex items-center gap-2">
                Rows per page:
                <Select
                  value={perPage}
                  size="compact"
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </Select>
              </label>
            </div>
          </Card>
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
          --history-text: var(--semlox-text-primary);
          --history-text2: var(--semlox-text-secondary);
          --history-muted: var(--semlox-text-muted);
          --history-faint: #1e293b;
          --history-input: var(--semlox-interactive-surface);
          --history-input-border: var(--semlox-interactive-border);
          --history-row-hover: rgba(255, 255, 255, 0.025);
          --history-row-selected: rgba(59, 130, 246, 0.07);
          --history-table-head: rgba(255, 255, 255, 0.02);
          --history-divider: rgba(255, 255, 255, 0.06);
          background: var(--history-bg);
          color: var(--history-text);
        }
        .dashboard-theme-light .history-page {
          --history-bg: #f4f7fb;
          --history-card: #ffffff;
          --history-card-border: #d5deea;
          --history-card-hover: #edf4ff;
          --history-text: var(--semlox-text-primary);
          --history-text2: var(--semlox-text-secondary);
          --history-muted: var(--semlox-text-muted);
          --history-faint: #718096;
          --history-input: var(--semlox-interactive-surface);
          --history-input-border: var(--semlox-interactive-border);
          --history-row-hover: #edf4ff;
          --history-row-selected: #e6f0ff;
          --history-table-head: #f8fafc;
          --history-divider: #d5deea;
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
        .history-stat-card {
          position: relative;
          padding: 16px 18px;
          transition: all 0.2s;
        }
        .history-stat-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 2px; }
        .history-stat-blue::before { background: linear-gradient(90deg, #3b82f6, #06b6d4); }
        .history-stat-green::before { background: linear-gradient(90deg, #10b981, #06b6d4); }
        .history-stat-red::before { background: linear-gradient(90deg, #ef4444, #f97316); }
        .history-stat-amber::before { background: linear-gradient(90deg, #f59e0b, #f97316); }
        .history-stat-card:hover { transform: translateY(-1px); border-color: rgba(59, 130, 246, 0.25); }
        .history-stat-label { margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
        .history-stat-value { margin-bottom: 6px; letter-spacing: -0.04em; }
        .history-stat-value-blue { color: #3b82f6; }
        .history-stat-value-green { color: #10b981; }
        .history-stat-value-red { color: #ef4444; }
        .history-stat-value-amber { color: #f59e0b; }
        .history-filter-bar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 16px;
        }
        .history-filter-divider { width: 1px; height: 26px; background: var(--history-divider); }
        .history-date-button {
          position: relative;
          min-width: 104px;
        }
        .history-calendar-popup {
          position: absolute;
          left: 0;
          top: calc(100% + 8px);
          z-index: 100;
          width: 300px;
          border: 1px solid rgba(59, 130, 246, 0.24);
          border-radius: var(--semlox-radius-card);
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
          color: #52647a;
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
        .history-table-top { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--history-divider); padding: 14px 18px; }
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table th { border-bottom: 1px solid var(--history-divider); background: var(--history-table-head); padding: 10px 14px; text-align: left; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
        .history-table td { border-bottom: 1px solid var(--history-divider); padding: 11px 14px; vertical-align: middle; }
        .history-table tbody tr:hover td { cursor: pointer; background: var(--history-row-hover); }
        .history-table tbody tr.history-row-selected td { background: var(--history-row-selected); }
        .history-check { display: flex; width: 15px; height: 15px; flex-shrink: 0; align-items: center; justify-content: center; border: 1.5px solid var(--history-input-border); border-radius: 3px; background: var(--history-input); color: white; }
        .history-check-on { border-color: #3b82f6; background: #3b82f6; }
        .history-doc-tag { display: inline-flex; align-items: center; border: 1px solid rgba(59, 130, 246, 0.15); border-radius: var(--semlox-radius-compact); background: rgba(59, 130, 246, 0.08); padding: 3px 8px; color: #3b82f6; font-family: monospace; font-size: var(--semlox-font-helper); font-weight: 700; }
        .history-user-avatar { display: flex; width: 22px; height: 22px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 8px; font-weight: 700; }
        .history-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--history-divider); padding: 12px 18px; }
        .history-page-button { width: 32px; padding: 0; border-color: var(--history-card-border); background: var(--history-card); color: var(--history-muted); }
        .history-detail-drawer { width: 0; flex-shrink: 0; overflow: hidden; border-left: 0 solid var(--history-card-border); background: var(--history-card); transition: width 0.3s ease, border-width 0.3s ease; }
        .history-detail-open { width: 380px; border-left-width: 1px; }
        .history-drawer-header { display: flex; height: 60px; align-items: center; gap: 10px; border-bottom: 1px solid var(--history-divider); padding: 0 18px; }
        .history-close-button { display: flex; width: 26px; height: 26px; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid var(--history-card-border); border-radius: 6px; background: var(--history-card); color: var(--history-muted); }
        .history-close-button:hover { border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }
        .history-drawer-body { height: calc(100% - 116px); overflow-y: auto; padding: 16px; scrollbar-width: thin; scrollbar-color: var(--history-faint) transparent; }
        .history-drawer-section { margin-bottom: 18px; }
        .history-drawer-section-title { margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.8; }
        .history-summary-grid { display: flex; overflow: hidden; border: 1px solid var(--history-card-border); border-radius: var(--semlox-radius-control); }
        .history-summary-item { flex: 1; border-right: 1px solid var(--history-card-border); padding: 12px; text-align: center; }
        .history-summary-item:last-child { border-right: 0; }
        .history-summary-label { letter-spacing: 0.04em; }
        .history-detail-tile,
        .history-field-card { border: 1px solid var(--history-card-border); border-radius: 8px; background: var(--history-card); padding: 10px 12px; }
        .history-field-card { margin-bottom: 6px; }
        .history-drawer-actions { display: flex; height: 56px; gap: 8px; border-top: 1px solid var(--history-divider); padding: 10px 16px; }
        @media (max-width: 1100px) {
          .history-detail-open { position: absolute; inset: 0 0 0 auto; z-index: 30; width: min(380px, 92vw); box-shadow: -20px 0 60px rgba(0, 0, 0, 0.4); }
        }
        @media (max-width: 767px) {
          .history-main { padding: 16px; }
          .history-filter-divider { display: none; }
        }
      `}</style>
    </main>
  );
}
