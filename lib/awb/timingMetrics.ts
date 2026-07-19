// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { AWAY_GRACE_MS, INACTIVITY_GRACE_MS } from "./activeReviewTimer.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
export { formatDuration } from "../formatDuration.ts";

export const MAX_REVIEW_SESSION_MS = 24 * 60 * 60 * 1000;
type JsonRecord = Record<string, unknown>;

export type ProcessingTimingMetrics = {
  extractor_ms: number | null;
  llm_ms: number | null;
  business_logic_ms: number | null;
  total_ms: number | null;
};

export type ReviewCheckpoint = {
  sessionId: string;
  checkpointSequence: number;
  activeMs: number;
  reason:
    | "periodic"
    | "hidden"
    | "away_timeout"
    | "inactive_timeout"
    | "pagehide"
    | "draft_saved"
    | "issued"
    | "route_change";
};

const REVIEW_REASONS = new Set<ReviewCheckpoint["reason"]>([
  "periodic",
  "hidden",
  "away_timeout",
  "inactive_timeout",
  "pagehide",
  "draft_saved",
  "issued",
  "route_change",
]);

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function secondsToMilliseconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 1000);
}

export function millisecondsValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function parseReviewCheckpoint(
  value: unknown,
  expectedReason?: ReviewCheckpoint["reason"]
): ReviewCheckpoint | null {
  const body = asRecord(value);
  if (
    typeof body.sessionId !== "string" ||
    typeof body.checkpointSequence !== "number" ||
    typeof body.activeMs !== "number" ||
    typeof body.reason !== "string" ||
    !REVIEW_REASONS.has(body.reason as ReviewCheckpoint["reason"]) ||
    (expectedReason && body.reason !== expectedReason)
  ) {
    return null;
  }
  return {
    sessionId: body.sessionId,
    checkpointSequence: body.checkpointSequence,
    activeMs: body.activeMs,
    reason: body.reason as ReviewCheckpoint["reason"],
  };
}

export function countCorrectedFields(
  fields: Array<{ value: string | null; original_value: string | null }>
) {
  return fields.reduce(
    (count, field) =>
      String(field.value ?? "").trim() !== String(field.original_value ?? "").trim()
        ? count + 1
        : count,
    0
  );
}

export function closeActiveReviewInterval(
  accumulatedActiveMs: number,
  activeIntervalStartedAt: number | null,
  lastActivityAt: number | null,
  now: number
) {
  if (activeIntervalStartedAt === null || lastActivityAt === null) {
    return Math.max(0, accumulatedActiveMs);
  }
  const end = Math.min(now, lastActivityAt + INACTIVITY_GRACE_MS);
  return Math.max(
    0,
    accumulatedActiveMs + Math.max(0, end - activeIntervalStartedAt)
  );
}

function firstValid(record: JsonRecord, millisecondKeys: string[], secondKeys: string[]) {
  for (const key of millisecondKeys) {
    const value = millisecondsValue(record[key]);
    if (value !== null) return value;
  }
  for (const key of secondKeys) {
    const value = secondsToMilliseconds(record[key]);
    if (value !== null) return value;
  }
  return null;
}

export function parseProviderTiming(raw: unknown): ProcessingTimingMetrics {
  const timing = asRecord(asRecord(asRecord(raw).data).meta).timing;
  const record = asRecord(timing);
  return {
    extractor_ms: firstValid(
      record,
      ["extractor_duration_ms", "ocr_duration_ms", "ocr_ms"],
      ["extractor_seconds", "ocr_seconds"]
    ),
    llm_ms: firstValid(
      record,
      ["ai_duration_ms", "llm_duration_ms", "llm_ms"],
      ["llm_verify_seconds", "ai_seconds", "llm_seconds"]
    ),
    business_logic_ms: firstValid(
      record,
      ["business_logic_duration_ms", "rules_duration_ms", "rules_ms"],
      ["rules_seconds", "business_logic_seconds"]
    ),
    total_ms: firstValid(
      record,
      ["total_processing_duration_ms", "total_duration_ms"],
      ["total_seconds"]
    ),
  };
}

export function mergeAwbTimingSummary(
  summary: unknown,
  patch: {
    processing?: ProcessingTimingMetrics;
    lifecycle?: JsonRecord;
    quality?: JsonRecord;
    review?: JsonRecord;
  }
) {
  const root = asRecord(summary);
  const timing = asRecord(root.timing_metrics);
  return {
    ...root,
    timing_metrics: {
      ...timing,
      version: 1,
      ...(patch.processing
        ? { processing: { ...asRecord(timing.processing), ...patch.processing } }
        : {}),
      ...(patch.lifecycle
        ? { lifecycle: { ...asRecord(timing.lifecycle), ...patch.lifecycle } }
        : {}),
      ...(patch.quality
        ? { quality: { ...asRecord(timing.quality), ...patch.quality } }
        : {}),
      ...(patch.review
        ? { review: { ...asRecord(timing.review), ...patch.review } }
        : {}),
    },
  };
}

export function applyReviewCheckpoint(
  summary: unknown,
  checkpoint: ReviewCheckpoint,
  serverTimestamp: string
) {
  if (
    !/^[a-zA-Z0-9_-]{8,120}$/.test(checkpoint.sessionId) ||
    !Number.isInteger(checkpoint.checkpointSequence) ||
    checkpoint.checkpointSequence < 1 ||
    !Number.isFinite(checkpoint.activeMs) ||
    checkpoint.activeMs < 0 ||
    checkpoint.activeMs > MAX_REVIEW_SESSION_MS
  ) {
    return { accepted: false, summary };
  }
  const root = asRecord(summary);
  const timing = asRecord(root.timing_metrics);
  const review = asRecord(timing.review);
  const sessions = asRecord(review.sessions);
  const previous = asRecord(sessions[checkpoint.sessionId]);
  const previousSequence = Number(previous.checkpoint_sequence) || 0;
  const previousActiveMs = Number(previous.active_ms) || 0;
  if (
    checkpoint.checkpointSequence <= previousSequence ||
    checkpoint.activeMs < previousActiveMs
  ) {
    return { accepted: false, summary };
  }
  const nextSessions = {
    ...sessions,
    [checkpoint.sessionId]: {
      active_ms: Math.round(checkpoint.activeMs),
      checkpoint_sequence: checkpoint.checkpointSequence,
      updated_at: serverTimestamp,
    },
  };
  const activeMs = Object.values(nextSessions).reduce<number>(
    (total, value) => total + (millisecondsValue(asRecord(value).active_ms) ?? 0),
    0
  );
  return {
    accepted: true,
    summary: mergeAwbTimingSummary(root, {
      review: {
        version: 2,
        method: "focus-visibility-activity-v2",
        away_grace_ms: AWAY_GRACE_MS,
        inactivity_grace_ms: INACTIVITY_GRACE_MS,
        sessions: nextSessions,
        active_ms: activeMs,
        calculated_at: serverTimestamp,
      },
    }),
  };
}

export function timingMetricsFromSummary(summary: unknown) {
  const timing = asRecord(asRecord(summary).timing_metrics);
  const processing = asRecord(timing.processing);
  const review = asRecord(timing.review);
  const quality = asRecord(timing.quality);
  const lifecycle = asRecord(timing.lifecycle);
  return {
    extractorMs: millisecondsValue(processing.extractor_ms),
    llmMs: millisecondsValue(processing.llm_ms),
    businessLogicMs: millisecondsValue(processing.business_logic_ms),
    totalMs: millisecondsValue(processing.total_ms),
    activeReviewMs: millisecondsValue(review.active_ms),
    reviewMethod:
      typeof review.method === "string" ? review.method : null,
    awayGraceMs: millisecondsValue(review.away_grace_ms),
    inactivityGraceMs: millisecondsValue(review.inactivity_grace_ms),
    reviewCalculatedAt:
      typeof review.calculated_at === "string" ? review.calculated_at : null,
    correctedFieldsCount: millisecondsValue(quality.corrected_fields_count),
    qualityCalculatedAt:
      typeof quality.calculated_at === "string" ? quality.calculated_at : null,
    reviewReadyAt:
      typeof lifecycle.review_ready_at === "string"
        ? lifecycle.review_ready_at
        : null,
    uploadStartedAt:
      typeof lifecycle.upload_started_at === "string"
        ? lifecycle.upload_started_at
        : null,
    issuedAt:
      typeof lifecycle.issued_at === "string" ? lifecycle.issued_at : null,
    uploadToIssueMs: millisecondsValue(lifecycle.upload_to_issue_ms),
  };
}

export type TimingCompleteness =
  | "complete"
  | "partial"
  | "legacy"
  | "unavailable";

export function timingCompletenessFromSummary(
  summary: unknown,
  legacyProcessingMs: number | null | undefined
): TimingCompleteness {
  const metrics = timingMetricsFromSummary(summary);
  const current = [
    metrics.extractorMs,
    metrics.llmMs,
    metrics.businessLogicMs,
    metrics.totalMs,
    metrics.activeReviewMs,
    metrics.uploadToIssueMs,
  ];
  const available = current.filter((value) => value !== null).length;

  if (available === current.length) return "complete";
  if (available > 0) return "partial";
  if (
    typeof legacyProcessingMs === "number" &&
    Number.isFinite(legacyProcessingMs) &&
    legacyProcessingMs >= 0
  ) {
    return "legacy";
  }
  return "unavailable";
}
