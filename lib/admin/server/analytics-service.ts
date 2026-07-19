import "server-only";

import type { AdminAnalyticsScope, AdminOverviewResponse, AdminSemanticTone } from "@/lib/admin/types";
import { getAdminConfidenceTone, getAdminCorrectionRateTone, getAdminStatusTone } from "@/lib/admin/status";
import { formatAdminStatusLabel, roundAdminRate } from "./mappers";
import { getAdminOverviewRows } from "./repository";
import { average, boundedPercent, countByStatus, EDITED_FIELDS_LABEL, EDITED_FIELDS_TOOLTIP, isFieldDifferentFromAiOutput, validConfidencePercentages, validProcessingTimes } from "@/lib/admin/metrics";

const percent = boundedPercent;

export async function getAdminOverviewAnalytics(scope: AdminAnalyticsScope): Promise<AdminOverviewResponse> {
  const { documents, fields } = await getAdminOverviewRows(scope);
  const fieldsByDocument = new Map<string, typeof fields>();
  for (const field of fields) {
    const existing = fieldsByDocument.get(field.document_id) ?? [];
    existing.push(field);
    fieldsByDocument.set(field.document_id, existing);
  }

  const failed = documents.filter((document) => document.status === "failed").length;
  const issued = documents.filter((document) => document.status === "issued").length;
  const reviewRequired = documents.filter((document) => document.status === "review_required").length;
  const completedExtractions = documents.filter((document) => document.status !== "failed" && fieldsByDocument.has(document.id)).length;
  const changedFields = fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value));
  const correctedDocumentIds = new Set(changedFields.map((field) => field.document_id));
  const extractedDocumentIds = new Set(fields.map((field) => field.document_id));
  const zeroCorrectionDocuments = [...extractedDocumentIds].filter((id) => !correctedDocumentIds.has(id)).length;
  const confidences = validConfidencePercentages(fields.map((field) => field.confidence));
  const averageConfidence = roundAdminRate(average(confidences));
  const processingTimes = validProcessingTimes(documents.map((document) => document.processing_time_ms));
  const averageProcessingSeconds = roundAdminRate(average(processingTimes) / 1000);
  const correctionRate = percent(changedFields.length, fields.length);

  const statusCounts = countByStatus(documents);

  const fieldGroups = new Map<string, typeof fields>();
  for (const field of fields) {
    const group = fieldGroups.get(field.key) ?? [];
    group.push(field);
    fieldGroups.set(field.key, group);
  }
  const problemFields = [...fieldGroups.entries()].map(([key, group]) => {
    const corrections = group.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value)).length;
    const review = group.filter((field) => field.needs_review).length;
    const confidence = roundAdminRate(average(validConfidencePercentages(group.map((field) => field.confidence))));
    const rate = percent(corrections, group.length);
    return { key, name: group[0]?.label ?? key, occurrences: group.length, confidence, reviewRate: percent(review, group.length), correctionRate: rate, tone: getAdminCorrectionRateTone(rate) };
  }).sort((a, b) => b.correctionRate - a.correctionRate || b.reviewRate - a.reviewRate).slice(0, 6);

  const daily = new Map<string, { confidenceTotal: number; confidenceCount: number; totalFields: number; changed: number }>();
  for (const document of documents) {
    const day = document.created_at.slice(0, 10);
    const group = daily.get(day) ?? { confidenceTotal: 0, confidenceCount: 0, totalFields: 0, changed: 0 };
    for (const field of fieldsByDocument.get(document.id) ?? []) {
      group.totalFields += 1;
      const confidence = validConfidencePercentages([field.confidence])[0];
      if (confidence !== undefined) {
        group.confidenceTotal += confidence;
        group.confidenceCount += 1;
      }
      if (isFieldDifferentFromAiOutput(field.value, field.original_value)) group.changed += 1;
    }
    daily.set(day, group);
  }
  const confidenceTrend = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([day, group]) => ({
    day: day.slice(5),
    confidence: group.confidenceCount ? roundAdminRate(group.confidenceTotal / group.confidenceCount) : 0,
    correction: percent(group.changed, group.totalFields),
  }));

  const documentConfidence = (id: string) => {
    const group = fieldsByDocument.get(id) ?? [];
    const values = validConfidencePercentages(group.map((field) => field.confidence));
    return values.length ? roundAdminRate(average(values)) : null;
  };
  const highRiskDocuments = documents
    .filter((document) => document.status === "failed" || document.status === "review_required")
    .map((document) => ({ id: document.id, fileName: document.file_name, confidence: documentConfidence(document.id), status: document.status, createdAt: document.created_at }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const metric = (key: string, label: string, value: string, note: string, tone: AdminSemanticTone, tooltip?: string) => ({ key, label, value, note, tone, tooltip });
  return {
    source: "database",
    generatedAt: new Date().toISOString(),
    metrics: [
      metric("documents", "Documents Processed", String(documents.length), "Persisted AWB documents", "info"),
      metric("fields", "Extracted Fields", String(fields.length), "Persisted AWB field rows", "info"),
      metric("extracted", "Completed Extractions", String(completedExtractions), `${percent(completedExtractions, documents.length)}% contain extracted fields`, "success"),
      metric("review", "Review Required", String(reviewRequired), `${percent(reviewRequired, documents.length)}% of documents`, "warning"),
      metric("failed", "Failed Documents", String(failed), `${percent(failed, documents.length)}% of documents`, failed ? "danger" : "success"),
      metric("confidence", "Average AI Confidence", `${averageConfidence}%`, "Confidence, not measured accuracy", getAdminConfidenceTone(averageConfidence)),
      metric("edited-fields", EDITED_FIELDS_LABEL, `${changedFields.length} (${correctionRate}%)`, "Current stored values only", getAdminCorrectionRateTone(correctionRate), EDITED_FIELDS_TOOLTIP),
      metric("processing", "Average Processing Time", `${averageProcessingSeconds}s`, `${processingTimes.length} documents with timing`, "info"),
      metric("zero-correction", "Zero-Correction Documents", String(zeroCorrectionDocuments), `${percent(zeroCorrectionDocuments, extractedDocumentIds.size)}% of extracted documents`, "success"),
      metric("issued", "Issued Documents", String(issued), `${percent(issued, documents.length)}% of documents`, "success"),
    ],
    statusDistribution: [...statusCounts.entries()].map(([status, value]) => ({ name: formatAdminStatusLabel(status), value, tone: getAdminStatusTone(status) })),
    confidenceTrend,
    problemFields,
    fieldAgreement: {
      matchingFieldCount: fields.length - changedFields.length,
      totalFieldCount: fields.length,
      rate: percent(fields.length - changedFields.length, fields.length),
    },
    highRiskDocuments,
    capabilities: { correctionHistory: false, evaluationRuns: false, stageTiming: false, modelVersion: false },
  };
}
