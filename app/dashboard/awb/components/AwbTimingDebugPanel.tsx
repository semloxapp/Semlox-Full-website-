"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Badge, type BadgeProps } from "../../../components/ui/Badge";
import { formatDuration } from "@/lib/formatDuration";
import type { ActiveReviewDebugSnapshot } from "../../../hooks/useActiveReviewTimer";
import type { AwbExtractionResponse } from "@/lib/awb/types";

const COLLAPSED_KEY = "semlox:awb-timing-debug-collapsed";

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function durationBetween(
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (!start || !end) return null;
  const duration = Date.parse(end) - Date.parse(start);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function remainingDuration(total: number | null, accounted: number | null | undefined) {
  if (total === null || accounted === null || accounted === undefined) return null;
  return Math.max(0, total - accounted);
}

function statusPresentation(snapshot: ActiveReviewDebugSnapshot): {
  label: string;
  message: string;
  variant: BadgeProps["variant"];
} {
  if (snapshot.trackingEnabled === false) return { label: "Tracking disabled", message: "Server-side timing collection is disabled.", variant: "neutral" };
  switch (snapshot.mode) {
    case "another_tab": return { label: "Another tab owns timing", message: "Another browser tab currently owns timing for this document.", variant: "neutral" };
    case "waiting": return { label: "Waiting for first interaction", message: "Timer starts after your first review interaction.", variant: "neutral" };
    case "active": return { label: "Active", message: "Active review interaction is currently being counted.", variant: "success" };
    case "visible_inactive": return { label: "Visible but inactive", message: "The inactivity grace period is currently being counted.", variant: "warning" };
    case "away": return { label: "Away — grace period", message: "Timer is using the one-minute away grace period.", variant: "warning" };
    case "completed": return { label: "Completed", message: "Review timing is finalized for this document.", variant: "info" };
    default: return { label: "Paused", message: "Timing will resume after your next interaction.", variant: "neutral" };
  }
}

const INITIAL_SNAPSHOT: ActiveReviewDebugSnapshot = {
  activeMs: 0,
  acceptedMs: 0,
  localUnpersistedMs: 0,
  mode: "waiting",
  sessionId: null,
  checkpointSequence: 0,
  ownsTab: false,
  trackingEnabled: null,
};

export function AwbTimingDebugPanel({ extraction, getSnapshot, onRefresh }: {
  extraction: AwbExtractionResponse;
  getSnapshot: () => ActiveReviewDebugSnapshot;
  onRefresh?: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] =
    useState<ActiveReviewDebugSnapshot>(INITIAL_SNAPSHOT);
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(COLLAPSED_KEY) === "true"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const timing = extraction.meta.timingMetrics;
  const status =
    extraction.document.status === "issued"
      ? statusPresentation({ ...snapshot, mode: "completed" })
      : statusPresentation(snapshot);
  const displayedActiveMs =
    extraction.document.status === "issued" &&
    timing?.review.activeMs !== null &&
    timing?.review.activeMs !== undefined
      ? timing.review.activeMs
      : snapshot.activeMs;
  const uploadStartedAt = timing?.lifecycle.uploadStartedAt;
  const reviewReadyAt = timing?.lifecycle.reviewReadyAt;
  const issueClickedAt = timing?.lifecycle.issuedAt;
  const uploadToIssueMs = timing?.lifecycle.uploadToIssueMs;
  const uploadToReadyMs = durationBetween(uploadStartedAt, reviewReadyAt);
  const readyToIssueMs = durationBetween(reviewReadyAt, issueClickedAt);
  const systemOverheadMs = remainingDuration(
    uploadToReadyMs,
    timing?.processing.totalMs
  );
  const reviewWaitMs = remainingDuration(readyToIssueMs, displayedActiveMs);

  useEffect(() => {
    if (extraction.document.status === "issued") return;
    const interval = window.setInterval(() => {
      setSnapshot(getSnapshot());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [extraction.document.status, getSnapshot]);

  const stages = [
    ["Document AI / Extractor", timing?.processing.extractorMs],
    ["LLM Verification", timing?.processing.llmMs],
    ["Business Logic", timing?.processing.businessLogicMs],
    ["Total Automated Processing", timing?.processing.totalMs],
  ] as const;

  return (
    <section className="awb-timing-panel rounded-[9px] border border-[#2f80ff]/30 bg-[#081120] text-[#cbd5e1] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      <button type="button" onClick={() => setCollapsed((current) => {
        const next = !current;
        sessionStorage.setItem(COLLAPSED_KEY, String(next));
        return next;
      })} aria-expanded={!collapsed} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="awb-timing-title text-[12px] font-extrabold text-[#f8fafc]">Timing Verification — Testing Only</span>
        <Badge variant="info" size="small" className="text-[8px]">TEST MODE</Badge>
        <span className="ml-auto text-[#94a3b8]">{collapsed ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</span>
      </button>
      {onRefresh ? (
        <div className="awb-timing-toolbar flex justify-end border-t border-white/[0.08] px-4 py-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              setRefreshError(false);
              try {
                await onRefresh();
              } catch {
                setRefreshError(true);
              } finally {
                setRefreshing(false);
              }
            }}
            className="awb-timing-refresh inline-flex h-7 items-center gap-1 rounded-[6px] border border-white/15 bg-white/[0.03] px-2 text-[9px] font-semibold text-[#a8b5c8] hover:border-white/25 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""}/>
            {refreshing ? "Refreshing" : "Refresh metrics"}
          </button>
        </div>
      ) : null}
      {!collapsed ? (
        <div className="awb-timing-content border-t border-white/[0.08] px-4 py-3">
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[920px] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2">
              <div className="awb-timing-node awb-timing-node-primary rounded-[8px] border border-[#3b82f6]/35 bg-[#2563eb]/10 p-3">
                <div className="awb-timing-label text-[8px] font-bold uppercase tracking-[0.12em] text-[#8ea3bf]">Upload Started</div>
                <div className="awb-timing-value mt-1 text-[10px] font-semibold text-[#f8fafc]">{formatTimestamp(uploadStartedAt)}</div>
              </div>
              <div className="awb-timing-connector text-center text-[#8ea3bf]">
                <div className="text-[16px]">→</div>
                <div className="whitespace-nowrap text-[8px]">System overhead {formatDuration(systemOverheadMs)}</div>
              </div>
              <div className="awb-timing-node awb-timing-node-primary rounded-[8px] border border-[#3b82f6]/35 bg-[#2563eb]/10 p-3">
                <div className="awb-timing-label text-[8px] font-bold uppercase tracking-[0.12em] text-[#8ea3bf]">Automated Processing</div>
                <div className="awb-timing-value mt-1 font-mono text-[17px] font-extrabold text-[#f8fafc]">{formatDuration(timing?.processing.totalMs)}</div>
              </div>
              <div className="awb-timing-connector text-center text-[#8ea3bf]">
                <div className="text-[16px]">→</div>
                <div className="whitespace-nowrap text-[8px]">Review ready</div>
              </div>
              <div className="awb-timing-node awb-timing-node-review rounded-[8px] border border-emerald-400/30 bg-emerald-400/[0.08] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="awb-timing-label text-[8px] font-bold uppercase tracking-[0.12em] text-[#8ea3bf]">Active Review</div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div className="awb-timing-value mt-1 font-mono text-[17px] font-extrabold text-[#f8fafc]">{formatDuration(displayedActiveMs)}</div>
                <div className="awb-timing-muted mt-1 text-[8px] text-[#8ea3bf]">Waiting/paused {formatDuration(reviewWaitMs)}</div>
              </div>
              <div className="awb-timing-connector text-center text-[#8ea3bf]">
                <div className="text-[16px]">→</div>
                <div className="whitespace-nowrap text-[8px]">Issue click</div>
              </div>
              <div className="awb-timing-node awb-timing-node-issue rounded-[8px] border border-cyan-400/30 bg-cyan-400/[0.08] p-3">
                <div className="awb-timing-label text-[8px] font-bold uppercase tracking-[0.12em] text-[#8ea3bf]">Issue Clicked</div>
                <div className="awb-timing-value mt-1 text-[10px] font-semibold text-[#f8fafc]">{formatTimestamp(issueClickedAt)}</div>
                <div className="awb-timing-total mt-1 font-mono text-[13px] font-bold text-cyan-200">Total {formatDuration(uploadToIssueMs)}</div>
              </div>
            </div>
          </div>

          <div className="awb-timing-table-wrap mt-3 overflow-hidden rounded-[7px] border border-white/[0.1]">
            <table className="awb-timing-table w-full text-left text-[9px]">
              <thead className="awb-timing-table-head bg-white/[0.05] text-[#a8b5c8]"><tr><th className="px-3 py-2">Processing Stage</th><th className="px-3 py-2 text-right">Duration</th><th className="px-3 py-2">Status</th></tr></thead>
              <tbody>{stages.map(([label, value]) => <tr key={label} className="awb-timing-table-row border-t border-white/[0.08]"><td className="px-3 py-2">{label}</td><td className="awb-timing-value px-3 py-2 text-right font-mono text-[#f8fafc]">{formatDuration(value)}</td><td className="awb-timing-status px-3 py-2">{value === null || value === undefined ? "N/A" : "Available"}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="awb-timing-note mt-2 text-[9px] text-[#8ea3bf]">
            Total ends at the Issue AWB click; issue processing is excluded. Testing feature — timing display may be removed in production.
          </p>
        </div>
      ) : null}
      {refreshError ? <p className="px-4 pb-3 text-[9px] text-red-300">Metrics could not be refreshed.</p> : null}
    </section>
  );
}
