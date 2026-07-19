import type { AdminFieldIntelligenceItem, AdminFieldIntelligenceResponse, AdminFieldIntelligenceSortField, AdminFieldIntelligenceStatusFilter, AdminSortOrder } from "./types.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { average, boundedPercent, isFieldDifferentFromAiOutput, validConfidencePercentages } from "./metrics.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { getAdminConfidenceTone } from "./status.ts";

export type FieldAnalyticsRow = {
  id: string;
  document_id: string;
  key: string | null;
  label: string | null;
  value: string | null;
  original_value: string | null;
  confidence: number | string | null;
  needs_review: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
};

export type FieldIntelligenceQuery = { search: string | null; status: AdminFieldIntelligenceStatusFilter | null; sortBy: AdminFieldIntelligenceSortField; sortOrder: AdminSortOrder };

export function normalizeFieldKey(key: string | null | undefined) {
  return key?.trim().toLowerCase() || "unknown_field";
}

function chooseLabel(rows: FieldAnalyticsRow[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = row.label?.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? key.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function aggregateFieldGroup(fieldKey: string, rows: FieldAnalyticsRow[]): AdminFieldIntelligenceItem {
  const occurrenceCount = rows.length;
  const countStatus = (status: string) => rows.filter((row) => row.status === status).length;
  const validCount = countStatus("valid");
  const warningCount = countStatus("warning");
  const reviewCount = countStatus("review");
  const missingCount = countStatus("missing");
  const needsReviewCount = rows.filter((row) => row.needs_review).length;
  const editedFieldCount = rows.filter((row) => isFieldDifferentFromAiOutput(row.value, row.original_value)).length;
  const confidences = validConfidencePercentages(rows.map((row) => row.confidence));
  const averageConfidence = confidences.length ? Math.round(average(confidences) * 10) / 10 : null;
  const missingRate = boundedPercent(missingCount, occurrenceCount);
  const needsReviewRate = boundedPercent(needsReviewCount, occurrenceCount);
  const editedFieldRate = boundedPercent(editedFieldCount, occurrenceCount);
  const warningRate = boundedPercent(warningCount, occurrenceCount);
  const issues = [["missing", missingRate], ["review", needsReviewRate], ["edited", editedFieldRate], ["warning", warningRate]] as const;
  const primary = [...issues].sort((a, b) => b[1] - a[1])[0];
  const primaryIssue = primary[1] > 0 ? primary[0] : averageConfidence !== null && averageConfidence < 75 ? "low_confidence" : "none";
  return {
    fieldKey,
    fieldLabel: chooseLabel(rows, fieldKey),
    occurrenceCount,
    documentCount: new Set(rows.map((row) => row.document_id)).size,
    validCount,
    warningCount,
    reviewCount,
    missingCount,
    needsReviewCount,
    editedFieldCount,
    coverageRate: boundedPercent(occurrenceCount - missingCount, occurrenceCount),
    validRate: boundedPercent(validCount, occurrenceCount),
    reviewStatusRate: boundedPercent(reviewCount, occurrenceCount),
    missingRate,
    needsReviewRate,
    editedFieldRate,
    averageConfidence,
    primaryIssue,
    confidenceTone: averageConfidence === null ? "neutral" : getAdminConfidenceTone(averageConfidence),
  };
}

export function aggregateFieldIntelligence(rows: FieldAnalyticsRow[], query: FieldIntelligenceQuery, allowedFieldKeys?: ReadonlySet<string>): AdminFieldIntelligenceResponse {
  const groups = new Map<string, FieldAnalyticsRow[]>();
  for (const row of rows) {
    const key = normalizeFieldKey(row.key);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const allItems = [...groups]
    .filter(([key]) => !allowedFieldKeys || allowedFieldKeys.has(key))
    .map(([key, group]) => aggregateFieldGroup(key, group));
  const matchesStatus = (item: AdminFieldIntelligenceItem) => !query.status || ({ valid: item.validCount, warning: item.warningCount, review: item.reviewCount, missing: item.missingCount, needs_review: item.needsReviewCount, edited: item.editedFieldCount })[query.status] > 0;
  const needle = query.search?.toLowerCase();
  const items = allItems.filter((item) => (!needle || `${item.fieldKey} ${item.fieldLabel}`.toLowerCase().includes(needle)) && matchesStatus(item));
  items.sort((a, b) => {
    const left = a[query.sortBy];
    const right = b[query.sortBy];
    const comparison = typeof left === "string" ? left.localeCompare(String(right)) : (left ?? -1) - (Number(right) || 0);
    return query.sortOrder === "asc" ? comparison : -comparison;
  });
  const allConfidences = validConfidencePercentages(rows.map((row) => row.confidence));
  return {
    items,
    summary: {
      totalFieldRows: rows.length,
      distinctFieldCount: allItems.length,
      validFieldCount: rows.filter((row) => row.status === "valid").length,
      warningFieldCount: rows.filter((row) => row.status === "warning").length,
      reviewFieldCount: rows.filter((row) => row.status === "review").length,
      missingFieldCount: rows.filter((row) => row.status === "missing").length,
      needsReviewFieldCount: rows.filter((row) => row.needs_review).length,
      editedFieldCount: rows.filter((row) => isFieldDifferentFromAiOutput(row.value, row.original_value)).length,
      averageConfidence: allConfidences.length ? Math.round(average(allConfidences) * 10) / 10 : null,
    },
    appliedFilters: query,
  };
}
