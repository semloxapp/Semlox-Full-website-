import "server-only";

import type { AdminFieldIntelligenceDetail, AdminFieldOccurrenceExample } from "@/lib/admin/types";
import { aggregateFieldGroup, aggregateFieldIntelligence, normalizeFieldKey } from "@/lib/admin/field-intelligence";
import { isFieldDifferentFromAiOutput, validConfidencePercentages } from "@/lib/admin/metrics";
import { CURRENT_AWB_FIELD_KEYS, isCurrentAwbFieldKey } from "@/lib/awb/fieldRegistry";
import { getAdminDocumentMetadata, getAdminFieldAnalyticsRows } from "./repository";
import type { AdminFieldIntelligenceQuery } from "./validation";

export async function getAdminFieldIntelligence(query: AdminFieldIntelligenceQuery) {
  return aggregateFieldIntelligence(await getAdminFieldAnalyticsRows(query), query, CURRENT_AWB_FIELD_KEYS);
}

export async function getAdminFieldIntelligenceDetail(fieldKey: string): Promise<AdminFieldIntelligenceDetail | null> {
  if (!isCurrentAwbFieldKey(fieldKey)) return null;
  const allRows = await getAdminFieldAnalyticsRows({ dateFrom: null, dateTo: null, companyId: null, userId: null });
  const rows = allRows.filter((row) => normalizeFieldKey(row.key) === fieldKey);
  if (!rows.length) return null;
  const metrics = aggregateFieldGroup(fieldKey, rows);
  const documentIds = [...new Set(rows.map((row) => row.document_id))];
  const documentIdSet = new Set(documentIds);
  const documents = await getAdminDocumentMetadata(documentIds);
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const awbByDocument = new Map(allRows.filter((row) => row.key === "awb_number" && documentIdSet.has(row.document_id)).map((row) => [row.document_id, row.value?.trim() || null]));
  const mapExample = (row: typeof rows[number]): AdminFieldOccurrenceExample => {
    const document = documentsById.get(row.document_id);
    const confidence = validConfidencePercentages([row.confidence])[0];
    return {
      fieldId: row.id,
      documentId: row.document_id,
      awbNumber: awbByDocument.get(row.document_id) ?? null,
      fileName: document?.file_name ?? null,
      documentStatus: document?.status ?? "unknown",
      originalAiValue: row.original_value,
      currentValue: row.value,
      isDifferentFromAiOutput: isFieldDifferentFromAiOutput(row.value, row.original_value),
      confidence: confidence === undefined ? null : Math.round(confidence * 10) / 10,
      fieldStatus: row.status,
      needsReview: row.needs_review,
      documentUpdatedAt: document?.updated_at ?? null,
    };
  };
  const confidenceDistribution = { high: 0, good: 0, moderate: 0, low: 0, veryLow: 0, unavailable: 0 };
  for (const row of rows) {
    const value = validConfidencePercentages([row.confidence])[0];
    if (value === undefined) confidenceDistribution.unavailable += 1;
    else if (value >= 90) confidenceDistribution.high += 1;
    else if (value >= 75) confidenceDistribution.good += 1;
    else if (value >= 60) confidenceDistribution.moderate += 1;
    else if (value >= 40) confidenceDistribution.low += 1;
    else confidenceDistribution.veryLow += 1;
  }
  return {
    fieldKey,
    fieldLabel: metrics.fieldLabel,
    metrics,
    statusDistribution: { valid: metrics.validCount, warning: metrics.warningCount, review: metrics.reviewCount, missing: metrics.missingCount, needsReview: metrics.needsReviewCount },
    confidenceDistribution,
    differenceExamples: rows.filter((row) => isFieldDifferentFromAiOutput(row.value, row.original_value)).slice(0, 25).map(mapExample),
    reviewExamples: rows.filter((row) => row.needs_review || row.status === "review" || row.status === "warning" || row.status === "missing").slice(0, 25).map(mapExample),
    capabilities: { hasHistoricalCorrectionEvents: false, hasModelVersionComparison: false, hasEvaluationRunComparison: false },
  };
}
