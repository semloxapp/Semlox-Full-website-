export type FinalQualityField = {
  originalValue: unknown;
  finalValue: unknown;
  confidence?: unknown;
  status?: string | null;
};

export type FinalQualityMetrics = {
  totalFieldsCount: number;
  evaluatedFieldsCount: number;
  unchangedFieldsCount: number;
  correctedFieldsCount: number;
  finalFieldAccuracyPercent: number | null;
  correctionRatePercent: number | null;
  averageAiConfidencePercent: number | null;
  confidenceSampleCount: number;
  fieldCompletionPercent: number | null;
  validFieldRatePercent: number | null;
};

export type FinalQualityDocument = {
  id: string;
  status: string;
};

export type DocumentFinalQualityField = FinalQualityField & {
  documentId: string;
};

export function normalizeAwbComparisonValue(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function percent(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : null;
}

export function calculateFinalQualityMetrics(
  fields: FinalQualityField[]
): FinalQualityMetrics {
  let evaluatedFieldsCount = 0;
  let unchangedFieldsCount = 0;
  let correctedFieldsCount = 0;
  let completedFieldsCount = 0;
  let validFieldsCount = 0;
  let confidenceTotal = 0;
  let confidenceSampleCount = 0;

  for (const field of fields) {
    const original = normalizeAwbComparisonValue(field.originalValue);
    const finalValue = normalizeAwbComparisonValue(field.finalValue);

    if (finalValue) completedFieldsCount += 1;
    if (field.status === "valid") validFieldsCount += 1;

    if (original || finalValue) {
      evaluatedFieldsCount += 1;
      if (original === finalValue) unchangedFieldsCount += 1;
      else correctedFieldsCount += 1;
    }

    if (original) {
      const confidence = Number(field.confidence);
      if (Number.isFinite(confidence) && confidence >= 0 && confidence <= 1) {
        confidenceTotal += confidence * 100;
        confidenceSampleCount += 1;
      }
    }
  }

  return {
    totalFieldsCount: fields.length,
    evaluatedFieldsCount,
    unchangedFieldsCount,
    correctedFieldsCount,
    finalFieldAccuracyPercent: percent(
      unchangedFieldsCount,
      evaluatedFieldsCount
    ),
    correctionRatePercent: percent(correctedFieldsCount, evaluatedFieldsCount),
    averageAiConfidencePercent:
      confidenceSampleCount > 0
        ? confidenceTotal / confidenceSampleCount
        : null,
    confidenceSampleCount,
    fieldCompletionPercent: percent(completedFieldsCount, fields.length),
    validFieldRatePercent: percent(validFieldsCount, fields.length),
  };
}

export function calculateIssuedFinalQualityMetrics(
  documents: FinalQualityDocument[],
  fields: DocumentFinalQualityField[]
) {
  const issuedDocumentIds = new Set(
    documents
      .filter((document) => document.status === "issued")
      .map((document) => document.id)
  );
  return calculateFinalQualityMetrics(
    fields.filter((field) => issuedDocumentIds.has(field.documentId))
  );
}
