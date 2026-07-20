export type AwbExtractionMode = "mock" | "live" | "fallback";

export type AwbFieldStatus = "valid" | "review" | "warning" | "missing";

export type AwbExtractedField = {
  key: string;
  label: string;
  value: string;
  originalValue?: string;
  rawType?: string;
  confidence: number;
  confidencePercent: number;
  needsReview: boolean;
  comment?: string;
  status: AwbFieldStatus;
  color: "green" | "amber" | "red" | "blue";
  page?: number;
  source?: {
    text?: string;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  };
};

export type AwbExtractionResponse = {
  ok: true;
  mode: AwbExtractionMode;
  message: string;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    pages: number;
    status: "uploaded" | "extracting" | "review_required" | "ready_to_issue" | "draft" | "issued" | "failed";
    processingTimeMs: number;
    runId?: string;
  };
  summary: {
    totalFields: number;
    capturedFields: number;
    averageConfidence: number;
    averageConfidencePercent: number;
    needsReview: number;
    validFields: number;
    warningFields: number;
    missingFields: number;
  };
  fields: AwbExtractedField[];
  quality: {
    averageAiConfidencePercent: number | null;
    evaluatedFieldsCount: number;
    unchangedFieldsCount: number;
    correctedFieldsCount: number;
    finalFieldAccuracyPercent: number | null;
    correctionRatePercent: number | null;
    fieldCompletionPercent: number | null;
    validFieldRatePercent: number | null;
  };
  meta: {
    runId?: string;
    stages?: Record<string, string>;
    errors?: string[];
    totalSeconds?: number;
    timingMetrics?: {
      processing: {
        extractorMs: number | null;
        llmMs: number | null;
        businessLogicMs: number | null;
        totalMs: number | null;
      };
      review: {
        activeMs: number | null;
        method: string | null;
      };
      quality: {
        correctedFieldsCount: number | null;
      };
      lifecycle: {
        uploadStartedAt: string | null;
        reviewReadyAt: string | null;
        issuedAt: string | null;
        uploadToIssueMs: number | null;
      };
    };
  };
  warnings: string[];
  raw?: unknown;
};

export type NormalizeAwbExtractionOptions = {
  mode: AwbExtractionMode;
  documentId: string;
  fileName: string;
  fileType: string;
  pages?: number;
};
