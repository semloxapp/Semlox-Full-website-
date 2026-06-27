import type {
  AwbExtractedField,
  AwbExtractionResponse,
} from "./types";

type AwbDocumentStatus = AwbExtractionResponse["document"]["status"];

export function computeAwbFieldStats(
  fields: AwbExtractedField[],
  documentStatus?: AwbDocumentStatus
) {
  const issued = documentStatus === "issued";
  const totalCount = fields.length;
  const extractedCount = fields.filter((field) => field.value.trim()).length;
  const emptyCount = totalCount - extractedCount;
  const reviewCount = issued
    ? 0
    : fields.filter(
        (field) =>
          field.value.trim() &&
          field.color !== "blue" &&
          (field.needsReview ||
            field.status === "review" ||
            field.status === "warning" ||
            field.confidence < 0.95)
      ).length;
  const confidenceValues = fields
    .filter((field) => field.value.trim())
    .map((field) => field.confidence);
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((total, confidence) => total + confidence, 0) /
      confidenceValues.length
    : 0;
  return {
    extractedCount,
    reviewCount,
    emptyCount,
    totalCount,
    averageConfidence,
    averageConfidencePercent: Math.round(averageConfidence * 100),
    validCount: fields.filter((field) => field.status === "valid").length,
    warningCount: fields.filter((field) => field.status === "warning").length,
    missingCount: fields.filter((field) => field.status === "missing").length,
    finalizedCount: issued ? totalCount : 0,
    progress: issued
      ? 100
      : totalCount
        ? Math.round((extractedCount / totalCount) * 100)
        : 0,
  };
}

export function awbSummaryFromFields(
  fields: AwbExtractedField[]
): AwbExtractionResponse["summary"] {
  const stats = computeAwbFieldStats(fields);
  return {
    totalFields: stats.totalCount,
    capturedFields: stats.extractedCount,
    averageConfidence: stats.averageConfidence,
    averageConfidencePercent: stats.averageConfidencePercent,
    needsReview: stats.reviewCount + stats.emptyCount,
    validFields: stats.validCount,
    warningFields: stats.warningCount,
    missingFields: stats.missingCount,
  };
}
