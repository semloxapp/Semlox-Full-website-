import type { AdminCurrentDifferenceDetail, AdminCurrentDifferenceListItem, AdminCurrentDifferencesResponse } from "./types.ts";
import type { AdminDocumentRow, AdminFieldRow } from "./server/repository.ts";
import type { AdminCurrentDifferencesQuery } from "./server/validation.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { average, boundedPercent, isFieldDifferentFromAiOutput, validConfidencePercentages } from "./metrics.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { CURRENT_AWB_FIELD_DEFINITIONS, CURRENT_AWB_FIELD_KEYS } from "../awb/fieldRegistry.ts";

const capabilities = { hasHistoricalCorrectionEvents: false, hasCorrectedByUser: false, hasCorrectionTimestamps: false, hasCorrectionCategories: false } as const;
const percentConfidence = (value: number | string | null) => { const result = validConfidencePercentages([value])[0]; return result === undefined ? null : Math.round(result * 10) / 10; };
const countDistribution = (values: string[]) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>())].map(([name, value]) => ({ name, value }));

export function buildAdminCurrentDifferences(fields: AdminFieldRow[], documents: AdminDocumentRow[], query: AdminCurrentDifferencesQuery): AdminCurrentDifferencesResponse {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const awbByDocument = new Map(fields.filter((field) => field.key === "awb_number").map((field) => [field.document_id, field.value?.trim() || null]));
  const rawDifferences = fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value));
  const canonicalDifferences = rawDifferences.filter((field) => CURRENT_AWB_FIELD_KEYS.has(field.key));
  const canonicalRows = fields.filter((field) => CURRENT_AWB_FIELD_KEYS.has(field.key));
  const toItem = (field: AdminFieldRow): AdminCurrentDifferenceListItem => { const document = documentsById.get(field.document_id); return { fieldId: field.id ?? "", documentId: field.document_id, awbNumber: awbByDocument.get(field.document_id) ?? null, fileName: document?.file_name ?? null, documentStatus: document?.status ?? "unknown", fieldKey: field.key, fieldLabel: field.label, isCurrentCanonicalField: CURRENT_AWB_FIELD_KEYS.has(field.key), originalAiValue: field.original_value, currentValue: field.value, confidence: percentConfidence(field.confidence), fieldStatus: field.status, needsReview: field.needs_review, fieldCreatedAt: field.created_at ?? null, fieldUpdatedAt: field.updated_at ?? null, documentUpdatedAt: document?.updated_at ?? null }; };
  const canonicalItems = canonicalDifferences.map(toItem);
  const fieldCounts = new Map<string, { label: string; count: number }>();
  for (const item of canonicalItems) { const current = fieldCounts.get(item.fieldKey); fieldCounts.set(item.fieldKey, { label: item.fieldLabel, count: (current?.count ?? 0) + 1 }); }
  const byField = [...fieldCounts].map(([key, item]) => ({ key, name: item.label, value: item.count })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const confidences = canonicalItems.flatMap((item) => item.confidence === null ? [] : [item.confidence]);
  const confidenceNames = canonicalItems.map((item) => item.confidence === null ? "Unavailable" : item.confidence >= 90 ? "High (90–100%)" : item.confidence >= 75 ? "Good (75–89%)" : item.confidence >= 60 ? "Moderate (60–74%)" : item.confidence >= 40 ? "Low (40–59%)" : "Very low (0–39%)");
  let items = rawDifferences.map(toItem).filter((item) => query.includeLegacy || item.isCurrentCanonicalField);
  const needle = query.search?.toLowerCase();
  items = items.filter((item) => (!needle || [item.awbNumber, item.fileName, item.fieldLabel, item.fieldKey, item.documentId, item.fieldId].some((value) => value?.toLowerCase().includes(needle))) && (!query.fieldKey || item.fieldKey === query.fieldKey) && (!query.fieldStatus || item.fieldStatus === query.fieldStatus) && (!query.documentStatus || item.documentStatus === query.documentStatus) && (query.needsReview === null || item.needsReview === query.needsReview));
  items.sort((a, b) => { const left = a[query.sortBy] ?? ""; const right = b[query.sortBy] ?? ""; const comparison = typeof left === "number" ? left - Number(right) : String(left).localeCompare(String(right)); return query.sortOrder === "asc" ? comparison : -comparison; });
  const totalItems = items.length;
  const from = (query.page - 1) * query.pageSize;
  return { items: items.slice(from, from + query.pageSize), summary: { rawDifferenceCount: rawDifferences.length, canonicalDifferenceCount: canonicalItems.length, legacyDifferenceCount: rawDifferences.length - canonicalItems.length, affectedDocumentCount: new Set(canonicalItems.map((item) => item.documentId)).size, affectedCanonicalFieldTypeCount: fieldCounts.size, canonicalFieldRowCount: canonicalRows.length, differenceRate: boundedPercent(canonicalItems.length, canonicalRows.length), averageConfidence: confidences.length ? Math.round(average(confidences) * 10) / 10 : null, needsReviewDifferenceCount: canonicalItems.filter((item) => item.needsReview).length, mostAffectedField: byField[0] ? { key: byField[0].key, label: byField[0].name, count: byField[0].value } : null }, distributions: { byField, byFieldStatus: countDistribution(canonicalItems.map((item) => item.fieldStatus)), byDocumentStatus: countDistribution(canonicalItems.map((item) => item.documentStatus)), byConfidence: countDistribution(confidenceNames) }, fieldOptions: CURRENT_AWB_FIELD_DEFINITIONS.map(({ key, label }) => ({ key, label })), pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) }, appliedFilters: query, capabilities };
}

export function buildAdminCurrentDifferenceDetail(field: AdminFieldRow, document: AdminDocumentRow, documentFields: AdminFieldRow[]): AdminCurrentDifferenceDetail {
  const confidences = validConfidencePercentages(documentFields.map((item) => item.confidence));
  return { fieldId: field.id ?? "", document: { id: document.id, awbNumber: documentFields.find((item) => item.key === "awb_number")?.value?.trim() || null, fileName: document.file_name ?? null, status: document.status, createdAt: document.created_at, updatedAt: document.updated_at }, field: { key: field.key, label: field.label, isCurrentCanonicalField: CURRENT_AWB_FIELD_KEYS.has(field.key), originalAiValue: field.original_value, currentValue: field.value, confidence: percentConfidence(field.confidence), status: field.status, needsReview: field.needs_review, createdAt: field.created_at ?? null, updatedAt: field.updated_at ?? null }, context: { documentFieldCount: documentFields.length, documentDifferenceCount: documentFields.filter((item) => isFieldDifferentFromAiOutput(item.value, item.original_value)).length, documentAverageConfidence: confidences.length ? Math.round(average(confidences) * 10) / 10 : null }, capabilities: { hasHistoricalCorrectionEvents: false, hasCorrectedByUser: false, hasCorrectionTimestamp: false, hasCorrectionCategory: false } };
}
