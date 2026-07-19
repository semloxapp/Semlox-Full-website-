import type { AdminSemanticTone } from "./types";

const STATUS_TONES: ReadonlyArray<[RegExp, AdminSemanticTone]> = [
  [/^(available|completed|successful|success|issued|validated|valid|passed|healthy|resolved)$/, "success"],
  [/^(review required|review_required|needs review|warning|pending review|open)$/, "warning"],
  [/^(partial|draft|initial extraction|slow|degraded|retrying)$/, "partial"],
  [/^(failed|failure|critical|error|timeout|high risk|low confidence|validation failed)$/, "danger"],
  [/^(processing|running|active|current|in progress|extracting|uploaded|ready to issue|ready_to_issue)$/, "info"],
  [/^(unknown|not started|archived|cancelled|canceled|no data|n\/a)$/, "neutral"],
];

export function normalizeAdminStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatAdminStatusLabel(status: string) {
  const normalized = normalizeAdminStatus(status).replace(/_/g, " ");
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getAdminStatusTone(status: string): AdminSemanticTone {
  const normalized = normalizeAdminStatus(status);
  return STATUS_TONES.find(([pattern]) => pattern.test(normalized))?.[1] ?? "neutral";
}

export function getAdminConfidenceTone(value: number): AdminSemanticTone {
  if (value >= 90) return "success";
  if (value >= 75) return "info";
  if (value >= 60) return "warning";
  if (value >= 40) return "partial";
  return "danger";
}

export function getAdminCorrectionRateTone(value: number): AdminSemanticTone {
  if (value <= 5) return "success";
  if (value <= 10) return "info";
  if (value <= 20) return "warning";
  if (value <= 30) return "partial";
  return "danger";
}
