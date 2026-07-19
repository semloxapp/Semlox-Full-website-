import "server-only";

import type { AdminDocumentDetail, AdminDocumentListItem, AdminDocumentListResponse } from "@/lib/admin/types";
import { average, isFieldDifferentFromAiOutput, validConfidencePercentages, validProcessingTimes } from "@/lib/admin/metrics";
import { roundAdminRate } from "./mappers";
import { getAdminDocumentDetailRows, getAdminDocumentPage, getAdminFieldsForDocuments, type AdminDocumentRow, type AdminFieldRow } from "./repository";
import type { AdminDocumentQuery } from "./validation";

function summarizeFields(fields: AdminFieldRow[]) {
  const countStatus = (status: string) => fields.filter((field) => field.status === status).length;
  return {
    fieldCount: fields.length,
    validFieldCount: countStatus("valid"),
    warningFieldCount: countStatus("warning"),
    reviewFieldCount: countStatus("review"),
    missingFieldCount: countStatus("missing"),
    needsReviewFieldCount: fields.filter((field) => field.needs_review).length,
    editedFieldCount: fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value)).length,
  };
}

function awbNumber(fields: AdminFieldRow[]) {
  const value = fields.find((field) => field.key === "awb_number")?.value;
  return typeof value === "string" && value.trim() ? value : null;
}

function confidence(fields: AdminFieldRow[]) {
  const values = validConfidencePercentages(fields.map((field) => field.confidence));
  return values.length ? roundAdminRate(average(values)) : null;
}

function processingTimeSeconds(value: number | null) {
  const valid = validProcessingTimes([value]);
  return valid.length ? roundAdminRate(valid[0] / 1000) : null;
}

function mapListItem(document: AdminDocumentRow, fields: AdminFieldRow[]): AdminDocumentListItem {
  return {
    id: document.id,
    awbNumber: awbNumber(fields),
    fileName: document.file_name || null,
    status: document.status,
    ...summarizeFields(fields),
    averageConfidence: confidence(fields),
    processingTimeSeconds: processingTimeSeconds(document.processing_time_ms),
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    modelVersion: null,
  };
}

export async function getAdminDocuments(query: AdminDocumentQuery): Promise<AdminDocumentListResponse> {
  const { documents, totalItems } = await getAdminDocumentPage(query);
  const fields = await getAdminFieldsForDocuments(documents.map((document) => document.id));
  const fieldsByDocument = new Map<string, AdminFieldRow[]>();
  for (const field of fields) {
    const group = fieldsByDocument.get(field.document_id) ?? [];
    group.push(field);
    fieldsByDocument.set(field.document_id, group);
  }
  return {
    items: documents.map((document) => mapListItem(document, fieldsByDocument.get(document.id) ?? [])),
    pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) },
    appliedFilters: { search: query.search, status: query.status, sortBy: query.sortBy, sortOrder: query.sortOrder },
  };
}

export async function getAdminDocument(id: string): Promise<AdminDocumentDetail | null> {
  const { document, fields } = await getAdminDocumentDetailRows(id);
  if (!document) return null;
  return {
    id: document.id,
    awbNumber: awbNumber(fields),
    fileName: document.file_name || null,
    status: document.status,
    processingTimeSeconds: processingTimeSeconds(document.processing_time_ms),
    averageConfidence: confidence(fields),
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    modelVersion: null,
    summaryText: null,
    summary: summarizeFields(fields),
    fields: fields.map((field) => {
      const values = validConfidencePercentages([field.confidence]);
      return {
        id: field.id ?? `${document.id}:${field.key}`,
        fieldKey: field.key,
        fieldLabel: field.label,
        originalAiValue: field.original_value,
        currentValue: field.value,
        isDifferentFromAiOutput: isFieldDifferentFromAiOutput(field.value, field.original_value),
        confidence: values[0] === undefined ? null : roundAdminRate(values[0]),
        status: field.status,
        needsReview: field.needs_review,
        createdAt: field.created_at ?? null,
        updatedAt: field.updated_at ?? null,
      };
    }),
    capabilities: { hasHistoricalCorrectionEvents: false, hasStageTimings: false, hasModelVersion: false },
  };
}
