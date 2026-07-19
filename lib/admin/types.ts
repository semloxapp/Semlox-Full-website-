export type EvaluationRun = { id:string; name:string; modelVersion:string; documentCount:number; successRate:number; correctionRate:number; failureRate:number; averageConfidence:number; averageProcessingTime:number; status:"completed"|"running"|"failed"; startedAt:string; completedAt:string };
export type FieldMetric = { key:string; name:string; occurrences:number; coverage:number; confidence:number; reviewRate:number; correctionRate:number; missingRate:number; validationRate:number; issue:string; trend:"up"|"down"|"stable" };
export type Correction = { id:string; documentId:string; awbNumber:string; field:string; original:string; corrected:string; confidence:number; type:string; reviewer:string; correctedAt:string; modelVersion:string };
export type AuditDocument = { id:string; date:string; file:string; company:string; awbNumber:string; modelVersion:string; fieldsExtracted:number; fieldsCorrected:number; confidence:number; processingTime:number; status:string };
export type FailureRecord = { id:string; time:string; documentId:string; company:string; stage:string; category:string; message:string; retries:number; status:string };

export type AdminSemanticTone = "info" | "success" | "warning" | "partial" | "danger" | "neutral";

export type AdminAnalyticsScope = {
  dateFrom: string | null;
  dateTo: string | null;
  companyId: string | null;
  userId: string | null;
};

export type AdminAnalyticsFilterOptions = {
  companies: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string; email: string | null; companyIds: string[] }>;
};

export type AdminOverviewMetric = {
  key: string;
  label: string;
  value: string;
  note: string;
  tooltip?: string;
  tone: AdminSemanticTone;
};

export type AdminOverviewResponse = {
  source: "database";
  generatedAt: string;
  metrics: AdminOverviewMetric[];
  statusDistribution: Array<{ name: string; value: number; tone: AdminSemanticTone }>;
  confidenceTrend: Array<{ day: string; confidence: number; correction: number }>;
  problemFields: Array<{
    key: string;
    name: string;
    occurrences: number;
    confidence: number;
    reviewRate: number;
    correctionRate: number;
    tone: AdminSemanticTone;
  }>;
  fieldAgreement: {
    matchingFieldCount: number;
    totalFieldCount: number;
    rate: number;
  };
  highRiskDocuments: Array<{
    id: string;
    fileName: string;
    confidence: number | null;
    status: string;
    createdAt: string;
  }>;
  capabilities: {
    correctionHistory: boolean;
    evaluationRuns: boolean;
    stageTiming: boolean;
    modelVersion: boolean;
  };
};

export type AdminApiSuccess<T> = { ok: true; data: T };
export type AdminApiError = { ok: false; code: string; message: string };

export type AdminDocumentSortField = "createdAt" | "updatedAt" | "status" | "processingTime" | "fileName";
export type AdminSortOrder = "asc" | "desc";

export type AdminDocumentListItem = {
  id: string;
  awbNumber: string | null;
  fileName: string | null;
  status: string;
  fieldCount: number;
  validFieldCount: number;
  warningFieldCount: number;
  reviewFieldCount: number;
  missingFieldCount: number;
  needsReviewFieldCount: number;
  editedFieldCount: number;
  averageConfidence: number | null;
  processingTimeSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  modelVersion: null;
};

export type AdminDocumentListResponse = {
  items: AdminDocumentListItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  appliedFilters: { search: string | null; status: string | null; sortBy: AdminDocumentSortField; sortOrder: AdminSortOrder };
};

export type AdminDocumentFieldDetail = {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  originalAiValue: string | null;
  currentValue: string | null;
  isDifferentFromAiOutput: boolean;
  confidence: number | null;
  status: string;
  needsReview: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminDocumentDetail = {
  id: string;
  awbNumber: string | null;
  fileName: string | null;
  status: string;
  processingTimeSeconds: number | null;
  averageConfidence: number | null;
  createdAt: string;
  updatedAt: string;
  modelVersion: null;
  summaryText: string | null;
  summary: Omit<AdminDocumentListItem, "id" | "awbNumber" | "fileName" | "status" | "averageConfidence" | "processingTimeSeconds" | "createdAt" | "updatedAt" | "modelVersion">;
  fields: AdminDocumentFieldDetail[];
  capabilities: { hasHistoricalCorrectionEvents: false; hasStageTimings: false; hasModelVersion: false };
};

export type AdminFieldIntelligenceSortField = "fieldLabel" | "occurrenceCount" | "documentCount" | "coverageRate" | "averageConfidence" | "needsReviewRate" | "missingRate" | "editedFieldRate";
export type AdminFieldIntelligenceStatusFilter = "valid" | "warning" | "review" | "missing" | "needs_review" | "edited";
export type AdminFieldPrimaryIssue = "missing" | "review" | "warning" | "edited" | "low_confidence" | "none";

export type AdminFieldIntelligenceItem = {
  fieldKey: string;
  fieldLabel: string;
  occurrenceCount: number;
  documentCount: number;
  validCount: number;
  warningCount: number;
  reviewCount: number;
  missingCount: number;
  needsReviewCount: number;
  editedFieldCount: number;
  coverageRate: number;
  validRate: number;
  reviewStatusRate: number;
  missingRate: number;
  needsReviewRate: number;
  editedFieldRate: number;
  averageConfidence: number | null;
  primaryIssue: AdminFieldPrimaryIssue;
  confidenceTone: AdminSemanticTone;
};

export type AdminFieldIntelligenceResponse = {
  items: AdminFieldIntelligenceItem[];
  summary: {
    totalFieldRows: number;
    distinctFieldCount: number;
    validFieldCount: number;
    warningFieldCount: number;
    reviewFieldCount: number;
    missingFieldCount: number;
    needsReviewFieldCount: number;
    editedFieldCount: number;
    averageConfidence: number | null;
  };
  appliedFilters: { search: string | null; status: AdminFieldIntelligenceStatusFilter | null; sortBy: AdminFieldIntelligenceSortField; sortOrder: AdminSortOrder };
};

export type AdminFieldOccurrenceExample = {
  fieldId: string;
  documentId: string;
  awbNumber: string | null;
  fileName: string | null;
  documentStatus: string;
  originalAiValue: string | null;
  currentValue: string | null;
  isDifferentFromAiOutput: boolean;
  confidence: number | null;
  fieldStatus: string;
  needsReview: boolean;
  documentUpdatedAt: string | null;
};

export type AdminFieldIntelligenceDetail = {
  fieldKey: string;
  fieldLabel: string;
  metrics: AdminFieldIntelligenceItem;
  statusDistribution: { valid: number; warning: number; review: number; missing: number; needsReview: number };
  confidenceDistribution: { high: number; good: number; moderate: number; low: number; veryLow: number; unavailable: number };
  differenceExamples: AdminFieldOccurrenceExample[];
  reviewExamples: AdminFieldOccurrenceExample[];
  capabilities: { hasHistoricalCorrectionEvents: false; hasModelVersionComparison: false; hasEvaluationRunComparison: false };
};

export type AdminCurrentDifferenceSortField = "fieldUpdatedAt" | "documentUpdatedAt" | "confidence" | "fieldLabel" | "documentStatus" | "fieldStatus";
export type AdminCurrentDifferenceListItem = {
  fieldId: string;
  documentId: string;
  awbNumber: string | null;
  fileName: string | null;
  documentStatus: string;
  fieldKey: string;
  fieldLabel: string;
  isCurrentCanonicalField: boolean;
  originalAiValue: string | null;
  currentValue: string | null;
  confidence: number | null;
  fieldStatus: string;
  needsReview: boolean;
  fieldCreatedAt: string | null;
  fieldUpdatedAt: string | null;
  documentUpdatedAt: string | null;
};
export type AdminCurrentDifferencesResponse = {
  items: AdminCurrentDifferenceListItem[];
  summary: {
    rawDifferenceCount: number;
    canonicalDifferenceCount: number;
    legacyDifferenceCount: number;
    affectedDocumentCount: number;
    affectedCanonicalFieldTypeCount: number;
    canonicalFieldRowCount: number;
    differenceRate: number;
    averageConfidence: number | null;
    needsReviewDifferenceCount: number;
    mostAffectedField: { key: string; label: string; count: number } | null;
  };
  distributions: {
    byField: Array<{ key: string; name: string; value: number }>;
    byFieldStatus: Array<{ name: string; value: number }>;
    byDocumentStatus: Array<{ name: string; value: number }>;
    byConfidence: Array<{ name: string; value: number }>;
  };
  fieldOptions: Array<{ key: string; label: string }>;
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  appliedFilters: { search: string | null; fieldKey: string | null; fieldStatus: string | null; documentStatus: string | null; needsReview: boolean | null; includeLegacy: boolean; sortBy: AdminCurrentDifferenceSortField; sortOrder: AdminSortOrder };
  capabilities: { hasHistoricalCorrectionEvents: false; hasCorrectedByUser: false; hasCorrectionTimestamps: false; hasCorrectionCategories: false };
};
export type AdminCurrentDifferenceDetail = {
  fieldId: string;
  document: { id: string; awbNumber: string | null; fileName: string | null; status: string; createdAt: string | null; updatedAt: string | null };
  field: { key: string; label: string; isCurrentCanonicalField: boolean; originalAiValue: string | null; currentValue: string | null; confidence: number | null; status: string; needsReview: boolean; createdAt: string | null; updatedAt: string | null };
  context: { documentFieldCount: number; documentDifferenceCount: number; documentAverageConfidence: number | null };
  capabilities: { hasHistoricalCorrectionEvents: false; hasCorrectedByUser: false; hasCorrectionTimestamp: false; hasCorrectionCategory: false };
};

export type AdminPerformanceDocumentListType = "slow" | "failed";
export type AdminPerformanceDocumentSortField = "processingTime" | "createdAt" | "updatedAt" | "fileName" | "status";
export type AdminPerformanceDocumentItem = {
  id: string;
  fileName: string | null;
  awbNumber: string | null;
  status: string;
  processingTimeSeconds: number | null;
  ocrTimeSeconds: number | null;
  aiTimeSeconds: number | null;
  businessLogicTimeSeconds: number | null;
  totalLifecycleProcessingSeconds: number | null;
  reviewSessionSeconds: number | null;
  uploadToIssueSeconds: number | null;
  correctedFieldsCount: number | null;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
  failureCategory: null;
  safeFailureMessage: string | null;
  fieldCount: number;
  averageConfidence: number | null;
};
export type AdminPerformanceResponse = {
  summary: {
    totalDocuments: number;
    validProcessingSampleCount: number;
    missingOrInvalidProcessingTimeCount: number;
    averageProcessingTimeSeconds: number | null;
    medianProcessingTimeSeconds: number | null;
    p90ProcessingTimeSeconds: number | null;
    p95ProcessingTimeSeconds: number | null;
    fastestProcessingTimeSeconds: number | null;
    slowestProcessingTimeSeconds: number | null;
    failedDocumentCount: number;
    failureRate: number;
    failedDocumentProcessingSampleCount: number;
    failedDocumentMissingTimeCount: number;
    averageOcrTimeSeconds: number | null;
    averageAiTimeSeconds: number | null;
    averageBusinessLogicTimeSeconds: number | null;
    averageLifecycleProcessingSeconds: number | null;
    averageReviewSessionSeconds: number | null;
    medianReviewSessionSeconds: number | null;
    averageUploadToIssueSeconds: number | null;
    documentsWithReviewTiming: number;
    documentsMissingReviewTiming: number;
    issuedDocumentCount: number;
    totalCorrectedFields: number;
    averageCorrectionsPerIssuedDocument: number | null;
  };
  processingDistribution: Array<{ key: string; label: string; minimumSeconds: number | null; maximumSeconds: number | null; count: number; percentage: number }>;
  processingTrend: Array<{ date: string; averageProcessingTimeSeconds: number | null; sampleCount: number; failedDocumentCount: number }>;
  statusDistribution: Array<{ name: string; value: number; tone: AdminSemanticTone }>;
  percentileComparison: Array<{ name: string; value: number }>;
  slowestDocumentsPreview: AdminPerformanceDocumentItem[];
  failedDocumentsPreview: AdminPerformanceDocumentItem[];
  capabilities: { hasStageTimings: boolean; hasRetryHistory: false; hasStructuredFailureCategories: false; hasSafeFailureMessages: false; hasModelVersion: false };
};
export type AdminPerformanceDocumentListResponse = {
  items: AdminPerformanceDocumentItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  appliedFilters: { type: AdminPerformanceDocumentListType; search: string | null; sortBy: AdminPerformanceDocumentSortField; sortOrder: AdminSortOrder };
};
