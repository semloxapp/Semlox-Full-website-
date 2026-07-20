import {
  extractBearerTokenFromRequest,
  getMembershipForUserAndCompany,
  getMembershipsByUserId,
  getUserFromAccessToken,
} from "@/lib/auth";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import type {
  AwbExtractedField,
  AwbExtractionMode,
  AwbExtractionResponse,
  AwbFieldStatus,
} from "./types";
import {
  displayAwbFieldValue,
  verifySubmittedAwbFieldValues,
} from "./finalFieldValues";
import { calculateFinalQualityMetrics } from "./finalQualityMetrics";
import { awbSummaryFromFields } from "./fieldStats";
import type { AwbPerformanceStageRecorder } from "./performanceProfile";
import {
  applyReviewCheckpoint,
  asRecord,
  countCorrectedFields,
  mergeAwbTimingSummary,
  timingMetricsFromSummary,
  type ProcessingTimingMetrics,
  type ReviewCheckpoint,
} from "./timingMetrics";
export { validateAwbForIssue } from "./issueValidation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AWB_SOURCE_BUCKET = process.env.AWB_SOURCE_BUCKET || "awb-source-documents";
const SOURCE_SIGNED_URL_SECONDS = 60 * 60;

export type AwbAccessContext = {
  userId: string;
  companyId: string;
  role: string;
};

export type DocumentRow = {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  status: AwbExtractionResponse["document"]["status"];
  extraction_mode: AwbExtractionMode;
  run_id: string | null;
  pages: number | null;
  processing_time_ms: number | null;
  summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type FieldRow = {
  id: string;
  document_id: string;
  key: string;
  label: string;
  value: string | null;
  original_value: string | null;
  confidence: number | string;
  needs_review: boolean;
  status: AwbFieldStatus;
  color: AwbExtractedField["color"];
  comment: string | null;
  page: number | null;
  source: AwbExtractedField["source"] | null;
  edited_by: string | null;
  edited_at: string | null;
};

export function awbJsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function serviceHeaders(extra?: Record<string, string>) {
  if (!supabaseServiceRoleKey) throw new Error("AWB persistence service unavailable");
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function serviceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("AWB persistence service unavailable");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function safeStorageFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "source-file";
}

async function uploadAwbSourceFile(input: {
  companyId: string;
  userId: string;
  documentId: string;
  file: File;
}) {
  const path = `${input.companyId}/${input.documentId}/${safeStorageFileName(input.file.name)}`;
  const bytes = await input.file.arrayBuffer();
  const { error } = await serviceClient()
    .storage
    .from(AWB_SOURCE_BUCKET)
    .upload(path, bytes, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
      metadata: {
        document_id: input.documentId,
        uploaded_by: input.userId,
      },
    });
  if (error) throw new Error("Failed to store AWB source file");
  return path;
}

async function deleteAwbSourceFile(storagePath: string | null | undefined) {
  if (!storagePath) return;
  await serviceClient()
    .storage
    .from(AWB_SOURCE_BUCKET)
    .remove([storagePath])
    .catch(() => null);
}

export async function createAwbSourceSignedUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const { data, error } = await serviceClient()
    .storage
    .from(AWB_SOURCE_BUCKET)
    .createSignedUrl(storagePath, SOURCE_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function isAwbUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export async function authenticateAwbRequest(
  request: Request,
  requestedCompanyId?: string | null
): Promise<AwbAccessContext | null> {
  const token = await extractBearerTokenFromRequest(request);
  if (!token) return null;
  const user = await getUserFromAccessToken(token);
  if (!user?.id) return null;

  if (requestedCompanyId) {
    if (!isAwbUuid(requestedCompanyId)) return null;
    const membership = await getMembershipForUserAndCompany(user.id, requestedCompanyId);
    if (!membership?.accepted_at) return null;
    return {
      userId: user.id,
      companyId: requestedCompanyId,
      role: String(membership.role || "").toLowerCase(),
    };
  }

  const memberships = await getMembershipsByUserId(user.id);
  const accepted = memberships.filter((membership) => membership?.accepted_at && membership?.company_id);
  if (accepted.length !== 1) return null;
  return {
    userId: user.id,
    companyId: String(accepted[0].company_id),
    role: String(accepted[0].role || "").toLowerCase(),
  };
}

export async function createPersistedAwbExtraction(
  context: AwbAccessContext,
  extraction: AwbExtractionResponse,
  file: File,
  rawResponse: unknown = null,
  processingTiming?: ProcessingTimingMetrics,
  uploadStartedAt?: string,
  recordPerformanceStage?: AwbPerformanceStageRecorder
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const measure = async <T>(stage: string, operation: () => Promise<T>) => {
    const startedAt = performance.now();
    try {
      return await operation();
    } finally {
      recordPerformanceStage?.(stage, performance.now() - startedAt);
    }
  };
  const documentResponse = await measure("db_document_insert", () => fetch(`${supabaseUrl}/rest/v1/awb_documents?select=*`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      company_id: context.companyId,
      uploaded_by: context.userId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: null,
      status: extraction.document.status,
      extraction_mode: extraction.mode,
      run_id: extraction.meta.runId || null,
      pages: extraction.document.pages,
      processing_time_ms: extraction.document.processingTimeMs,
      summary: extraction.summary,
      raw_response: rawResponse,
    }),
  }));
  const documentJsonStartedAt = performance.now();
  const documentRows = await documentResponse.json().catch(() => []);
  recordPerformanceStage?.(
    "db_document_response_parse",
    performance.now() - documentJsonStartedAt
  );
  const document = Array.isArray(documentRows) ? (documentRows[0] as DocumentRow | undefined) : undefined;
  if (!documentResponse.ok || !document?.id) throw new Error("Failed to create AWB document");

  let storagePath: string | null = null;
  try {
    storagePath = await measure("storage_source_upload", () => uploadAwbSourceFile({
      companyId: context.companyId,
      userId: context.userId,
      documentId: document.id,
      file,
    }));
    const storageResponse = await measure("db_storage_path_update", () => fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`, {
      method: "PATCH",
      headers: serviceHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ storage_path: storagePath }),
    }));
    if (!storageResponse.ok) throw new Error("Failed to update AWB source path");
    document.storage_path = storagePath;
  } catch (error) {
    await deleteAwbSourceFile(storagePath);
    await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`, {
      method: "DELETE",
      headers: serviceHeaders(),
    }).catch(() => null);
    throw error;
  }

  const fieldResponse = await measure("db_fields_insert", () => fetch(`${supabaseUrl}/rest/v1/awb_fields`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify(
      extraction.fields.map((field) => ({
        document_id: document.id,
        key: field.key,
        label: field.label,
        value: field.value,
        original_value: field.value,
        confidence: field.confidence,
        needs_review: field.needsReview,
        status: field.status,
        color: field.color,
        comment: field.comment || null,
        page: field.page || null,
        source: field.source || null,
      }))
    ),
  }));
  if (!fieldResponse.ok) {
    await deleteAwbSourceFile(document.storage_path);
    await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`, {
      method: "DELETE",
      headers: serviceHeaders(),
    }).catch(() => null);
    throw new Error("Failed to create AWB fields");
  }

  if (processingTiming) {
    const reviewReadyAt = new Date().toISOString();
    const mergedSummary = mergeAwbTimingSummary(extraction.summary, {
      processing: processingTiming,
      lifecycle: {
        upload_started_at: uploadStartedAt ?? document.created_at,
        review_ready_at: reviewReadyAt,
      },
    });
    const timingResponse = await measure("db_timing_summary_update", () => fetch(
      `${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`,
      {
        method: "PATCH",
        headers: serviceHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({ summary: mergedSummary }),
      }
    ));
    if (!timingResponse.ok) {
      console.error("[awb-metrics] failed to persist review-ready timing", {
        documentId: document.id,
        companyId: context.companyId,
      });
    }
    document.summary = mergedSummary;
  }

  return document;
}

export async function createPersistedAwbFailure(
  context: AwbAccessContext,
  file: File,
  mode: AwbExtractionMode
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const response = await fetch(`${supabaseUrl}/rest/v1/awb_documents?select=id`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      company_id: context.companyId,
      uploaded_by: context.userId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: null,
      status: "failed",
      extraction_mode: mode,
      run_id: null,
      pages: 1,
      processing_time_ms: null,
      summary: {},
      raw_response: null,
    }),
  });
  const rows = await response.json().catch(() => []);
  const documentId =
    Array.isArray(rows) && typeof rows[0]?.id === "string" ? rows[0].id : null;
  if (!response.ok || !documentId) {
    throw new Error("Failed to create failed AWB document");
  }
  let storagePath: string | null = null;
  try {
    storagePath = await uploadAwbSourceFile({
      companyId: context.companyId,
      userId: context.userId,
      documentId,
      file,
    });
    const storageResponse = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
      method: "PATCH",
      headers: serviceHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ storage_path: storagePath }),
    });
    if (!storageResponse.ok) throw new Error("Failed to update failed AWB source path");
  } catch (error) {
    await deleteAwbSourceFile(storagePath);
    await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
      method: "DELETE",
      headers: serviceHeaders(),
    }).catch(() => null);
    throw error;
  }
  return documentId;
}

export async function getAwbDocumentForUser(request: Request, documentId: string) {
  if (!supabaseUrl || !isAwbUuid(documentId)) return null;
  const token = await extractBearerTokenFromRequest(request);
  if (!token) return null;
  const user = await getUserFromAccessToken(token);
  if (!user?.id) return null;

  const documentResponse = await fetch(
    `${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}&select=*`,
    { headers: serviceHeaders() }
  );
  const rows = await documentResponse.json().catch(() => []);
  const document = Array.isArray(rows) ? (rows[0] as DocumentRow | undefined) : undefined;
  if (!documentResponse.ok || !document) return null;

  const membership = await getMembershipForUserAndCompany(user.id, document.company_id);
  if (!membership?.accepted_at) return null;
  const role = String(membership.role || "").toLowerCase();
  if (!["owner", "admin"].includes(role) && document.uploaded_by !== user.id) return null;
  return {
    userId: user.id,
    document,
    role,
  };
}

export type AwbHistoryDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string | null;
  status: DocumentRow["status"];
  extractionMode: AwbExtractionMode;
  runId: string | null;
  pages: number;
  processingTimeMs: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  processedBy: {
    id: string;
    name: string;
    email: string;
  };
  awbNumber: string;
  action: string;
  fields: {
    total: number;
    captured: number;
    valid: number;
    warnings: number;
    review: number;
    missing: number;
  };
  quality: AwbExtractionResponse["quality"];
};

function historyAction(status: DocumentRow["status"]) {
  if (status === "draft") return "Draft Saved";
  if (status === "issued") return "Issued AWB";
  if (status === "failed") return "Failed";
  return "Initial Extraction";
}

async function getAwbHistoryFields(documentIds: string[]) {
  if (!supabaseUrl || !documentIds.length) return [];
  const documentIdBatches: string[][] = [];
  for (let index = 0; index < documentIds.length; index += 40) {
    documentIdBatches.push(documentIds.slice(index, index + 40));
  }

  const batchResults = await Promise.all(
    documentIdBatches.map(async (batch) => {
      const rows: FieldRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/awb_fields` +
            `?document_id=in.(${batch.join(",")})` +
            "&select=id,document_id,key,label,value,original_value,confidence,needs_review,status,color,comment,page,source,edited_by,edited_at" +
            "&order=id.asc" +
            `&limit=1000&offset=${offset}`,
          { headers: serviceHeaders() }
        );
        const page = response.ok ? await response.json().catch(() => null) : null;
        if (!response.ok || !Array.isArray(page)) {
          throw new Error("Failed to load AWB history fields");
        }
        rows.push(...(page as FieldRow[]));
        if (page.length < 1000) break;
      }
      return rows;
    })
  );

  return batchResults.flat();
}

export async function getAwbHistory(
  context: AwbAccessContext,
  scope: "my" | "company"
): Promise<AwbHistoryDocument[]> {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  if (scope === "company" && !["owner", "admin"].includes(context.role)) {
    throw new Error("COMPANY_HISTORY_FORBIDDEN");
  }

  const filters = [
    `company_id=eq.${context.companyId}`,
    scope === "my" ? `uploaded_by=eq.${context.userId}` : "",
    "select=*",
    "order=created_at.desc",
  ].filter(Boolean);
  const documentResponse = await fetch(
    `${supabaseUrl}/rest/v1/awb_documents?${filters.join("&")}`,
    { headers: serviceHeaders() }
  );
  const documentRows = await documentResponse.json().catch(() => []);
  if (!documentResponse.ok || !Array.isArray(documentRows)) {
    throw new Error("Failed to load AWB history");
  }
  const documents = documentRows as DocumentRow[];
  if (!documents.length) return [];

  const documentIds = documents.map((document) => document.id);
  const userIds = Array.from(new Set(documents.map((document) => document.uploaded_by)));
  const [fieldRows, profilesResponse, usersResponse] = await Promise.all([
    getAwbHistoryFields(documentIds),
    fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,full_name`, {
      headers: serviceHeaders(),
    }),
    fetch(`${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(",")})&select=id,email`, {
      headers: serviceHeaders(),
    }),
  ]);
  const profiles = profilesResponse.ok ? await profilesResponse.json().catch(() => []) : [];
  const users = usersResponse.ok ? await usersResponse.json().catch(() => []) : [];

  const fieldsByDocument = new Map<string, FieldRow[]>();
  for (const field of fieldRows) {
    const current = fieldsByDocument.get(field.document_id) || [];
    current.push(field);
    fieldsByDocument.set(field.document_id, current);
  }
  const profilesById = new Map(
    (Array.isArray(profiles) ? profiles : []).map((profile) => [
      String(profile.id),
      String(profile.full_name || ""),
    ])
  );
  const usersById = new Map(
    (Array.isArray(users) ? users : []).map((user) => [
      String(user.id),
      String(user.email || ""),
    ])
  );

  return documents.map((document) => {
    const rows = fieldsByDocument.get(document.id) || [];
    const fields = rows.map(fieldFromRow);
    const summary = summarizeAwbFields(fields);
    const quality = calculateFinalQualityMetrics(
      rows.map((field) => ({
        originalValue: field.original_value,
        finalValue: field.value,
        confidence: field.confidence,
        status: field.status,
      }))
    );
    const email = usersById.get(document.uploaded_by) || "";
    const name = profilesById.get(document.uploaded_by) || email || "Unknown user";
    return {
      id: document.id,
      fileName: document.file_name,
      fileType: document.file_type,
      fileSize: document.file_size,
      storagePath: document.storage_path,
      status: document.status,
      extractionMode: document.extraction_mode,
      runId: document.run_id,
      pages: document.pages || 1,
      processingTimeMs: document.processing_time_ms || 0,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      uploadedBy: document.uploaded_by,
      processedBy: { id: document.uploaded_by, name, email },
      awbNumber:
        rows.find((field) => field.key === "awb_number")?.value ||
        document.file_name ||
        document.id.slice(0, 8),
      action: historyAction(document.status),
      fields: {
        total: summary.totalFields,
        captured: summary.capturedFields,
        valid: summary.validFields,
        warnings: summary.warningFields,
        review: Math.max(0, summary.needsReview - summary.warningFields),
        missing: summary.missingFields,
      },
      quality: {
        averageAiConfidencePercent: quality.averageAiConfidencePercent,
        evaluatedFieldsCount: quality.evaluatedFieldsCount,
        unchangedFieldsCount: quality.unchangedFieldsCount,
        correctedFieldsCount: quality.correctedFieldsCount,
        finalFieldAccuracyPercent: quality.finalFieldAccuracyPercent,
        correctionRatePercent: quality.correctionRatePercent,
        fieldCompletionPercent: quality.fieldCompletionPercent,
        validFieldRatePercent: quality.validFieldRatePercent,
      },
    };
  });
}

export async function getAwbFields(documentId: string) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/awb_fields?document_id=eq.${documentId}&select=*&order=created_at.asc`,
    { headers: serviceHeaders() }
  );
  const rows = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(rows)) throw new Error("Failed to fetch AWB fields");
  return rows as FieldRow[];
}

function fieldFromRow(row: FieldRow): AwbExtractedField {
  const confidence = Math.min(1, Math.max(0, Number(row.confidence) || 0));
  return {
    key: row.key,
    label: row.label,
    value: displayAwbFieldValue(row),
    originalValue: row.original_value ?? "",
    confidence,
    confidencePercent: Math.round(confidence * 100),
    needsReview: row.needs_review,
    comment: row.comment || undefined,
    status: row.status,
    color: row.color,
    page: row.page || undefined,
    source: row.source || undefined,
  };
}

export function summarizeAwbFields(fields: AwbExtractedField[]): AwbExtractionResponse["summary"] {
  return awbSummaryFromFields(fields);
}

export function toAwbExtractionResponse(
  document: DocumentRow,
  fieldRows: FieldRow[]
): AwbExtractionResponse {
  const fields = fieldRows.map(fieldFromRow);
  const summary = summarizeAwbFields(fields);
  const quality = calculateFinalQualityMetrics(
    fieldRows.map((field) => ({
      originalValue: field.original_value,
      finalValue: field.value,
      confidence: field.confidence,
      status: field.status,
    }))
  );
  const timing = timingMetricsFromSummary(document.summary);
  return {
    ok: true,
    mode: document.extraction_mode,
    message: "AWB document loaded.",
    document: {
      id: document.id,
      fileName: document.file_name,
      fileType: document.file_type,
      pages: document.pages || 1,
      status: document.status,
      processingTimeMs: document.processing_time_ms || 0,
      runId: document.run_id || undefined,
    },
    summary,
    fields,
    quality: {
      averageAiConfidencePercent: quality.averageAiConfidencePercent,
      evaluatedFieldsCount: quality.evaluatedFieldsCount,
      unchangedFieldsCount: quality.unchangedFieldsCount,
      correctedFieldsCount: quality.correctedFieldsCount,
      finalFieldAccuracyPercent: quality.finalFieldAccuracyPercent,
      correctionRatePercent: quality.correctionRatePercent,
      fieldCompletionPercent: quality.fieldCompletionPercent,
      validFieldRatePercent: quality.validFieldRatePercent,
    },
    meta: {
      runId: document.run_id || undefined,
      totalSeconds: document.processing_time_ms ? document.processing_time_ms / 1000 : undefined,
      timingMetrics: {
        processing: {
          extractorMs: timing.extractorMs,
          llmMs: timing.llmMs,
          businessLogicMs: timing.businessLogicMs,
          totalMs: timing.totalMs ?? document.processing_time_ms ?? null,
        },
        review: {
          activeMs: timing.activeReviewMs,
          method: timing.reviewMethod,
        },
        quality: {
          correctedFieldsCount: timing.correctedFieldsCount,
        },
        lifecycle: {
          uploadStartedAt: timing.uploadStartedAt,
          reviewReadyAt: timing.reviewReadyAt,
          issuedAt: timing.issuedAt,
          uploadToIssueMs: timing.uploadToIssueMs,
        },
      },
    },
    warnings: fields
      .filter((field) => field.status !== "valid")
      .map((field) => `${field.label}: ${field.comment || "Review required"}`),
  };
}

export async function updateAwbFields(
  documentId: string,
  userId: string,
  updates: Array<{ key: string; value: string; reviewed?: boolean }>
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const existingRows = await getAwbFields(documentId);
  const byKey = new Map(existingRows.map((row) => [row.key, row]));
  const unknownKeys = updates
    .map((update) => update.key)
    .filter((key) => !byKey.has(key));
  if (unknownKeys.length) {
    throw new Error("AWB field update contains unknown fields");
  }
  const editedAt = new Date().toISOString();
  let changedCount = 0;

  for (const update of updates) {
    const existing = byKey.get(update.key);
    const value = update.value.trim();
    if (!existing) continue;
    const valueChanged = existing.value !== value;
    const acknowledged = update.reviewed === true || (valueChanged && Boolean(value));
    const needsReview = value
      ? acknowledged
        ? false
        : existing.needs_review
      : true;
    const status: AwbFieldStatus = value
      ? acknowledged
        ? "valid"
        : existing.status
      : "missing";
    if (
      !valueChanged &&
      existing.needs_review === needsReview &&
      existing.status === status
    ) {
      continue;
    }
    const response = await fetch(
      `${supabaseUrl}/rest/v1/awb_fields?document_id=eq.${documentId}&key=eq.${encodeURIComponent(update.key)}`,
      {
        method: "PATCH",
        headers: serviceHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          value,
          needs_review: needsReview,
          status,
          color: value ? (acknowledged ? "blue" : existing.color) : "red",
          comment:
            value && acknowledged ? "Manually reviewed" : existing.comment,
          edited_by: userId,
          edited_at: editedAt,
        }),
      }
    );
    if (!response.ok) throw new Error("Failed to update AWB field");
    changedCount += 1;

  }

  const fields = await getAwbFields(documentId);
  if (!verifySubmittedAwbFieldValues(updates, fields)) {
    throw new Error("Failed to verify persisted AWB field values");
  }
  const normalizedFields = fields.map(fieldFromRow);
  const summary = summarizeAwbFields(normalizedFields);
  const status = summary.needsReview > 0 ? "review_required" : "ready_to_issue";
  const currentDocumentResponse = await fetch(
    `${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}&select=summary`,
    { headers: serviceHeaders() }
  );
  const currentDocuments = currentDocumentResponse.ok
    ? await currentDocumentResponse.json().catch(() => [])
    : [];
  if (!currentDocumentResponse.ok) throw new Error("Failed to load AWB document summary");
  const mergedSummary = { ...asRecord(currentDocuments?.[0]?.summary), ...summary };
  const documentResponse = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ summary: mergedSummary, status }),
  });
  if (!documentResponse.ok) throw new Error("Failed to update AWB document");
  return {
    fields: normalizedFields,
    fieldRows: fields,
    summary,
    status,
    changedCount,
    persistedCount: updates.length,
  };
}

export async function setAwbDocumentDraft(documentId: string) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const response = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "draft" }),
  });
  if (!response.ok) throw new Error("Failed to save AWB draft");
}

export async function setAwbDocumentIssued(
  documentId: string,
  summary?: Record<string, unknown>,
  storagePath?: string | null
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  await deleteAwbSourceFile(storagePath);
  const response = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      status: "issued",
      storage_path: null,
      ...(summary ? { summary } : {}),
    }),
  });
  if (!response.ok) throw new Error("Failed to issue AWB");
}

export async function recordReviewCheckpoint(
  documentId: string,
  checkpoint: ReviewCheckpoint
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}&select=summary`,
    { headers: serviceHeaders() }
  );
  const rows = response.ok ? await response.json().catch(() => []) : [];
  if (!response.ok || !rows?.[0]) throw new Error("Failed to load AWB timing summary");
  const result = applyReviewCheckpoint(
    rows[0].summary,
    checkpoint,
    new Date().toISOString()
  );
  const activeMs =
    timingMetricsFromSummary(result.summary).activeReviewMs ?? 0;
  if (!result.accepted) return { accepted: false, activeMs };
  const patch = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ summary: result.summary }),
  });
  if (!patch.ok) throw new Error("Failed to save AWB review timing");
  return { accepted: true, activeMs };
}

export function buildIssuedTimingSummary(input: {
  document: DocumentRow;
  fields: FieldRow[];
  fieldSummary?: Record<string, unknown>;
  checkpoint?: ReviewCheckpoint | null;
  issuedAt: string;
}) {
  let summary: unknown = {
    ...asRecord(input.document.summary),
    ...asRecord(input.fieldSummary),
  };
  if (input.checkpoint) {
    summary = applyReviewCheckpoint(summary, input.checkpoint, input.issuedAt).summary;
  }
  const lifecycle = asRecord(asRecord(asRecord(summary).timing_metrics).lifecycle);
  const existingIssuedAt =
    typeof lifecycle.issued_at === "string" &&
    Number.isFinite(Date.parse(lifecycle.issued_at))
      ? lifecycle.issued_at
      : null;
  const effectiveIssuedAt = existingIssuedAt ?? input.issuedAt;
  const uploadStartedAt =
    typeof lifecycle.upload_started_at === "string" &&
    Number.isFinite(Date.parse(lifecycle.upload_started_at))
      ? lifecycle.upload_started_at
      : input.document.created_at;
  const uploadStartedAtMs = Date.parse(uploadStartedAt);
  const issuedAtMs = Date.parse(effectiveIssuedAt);
  return mergeAwbTimingSummary(summary, {
    quality: {
      corrected_fields_count: countCorrectedFields(input.fields),
      calculated_at: input.issuedAt,
    },
    lifecycle: {
      issued_at: effectiveIssuedAt,
      upload_to_issue_ms:
        Number.isFinite(uploadStartedAtMs) && Number.isFinite(issuedAtMs)
          ? Math.max(0, issuedAtMs - uploadStartedAtMs)
          : null,
    },
  });
}
