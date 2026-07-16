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
import { awbSummaryFromFields } from "./fieldStats";

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
  summary: AwbExtractionResponse["summary"] | null;
  created_at: string;
  updated_at: string;
};

export type FieldRow = {
  id: string;
  document_id: string;
  key: string;
  label: string;
  value: string;
  original_value: string;
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

export function awbJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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

async function bestEffortInsert(table: string, body: unknown) {
  if (!supabaseUrl || !supabaseServiceRoleKey) return false;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: serviceHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createAwbEvent(input: {
  documentId?: string | null;
  companyId: string;
  userId: string;
  eventType:
    | "uploaded"
    | "extraction_started"
    | "extraction_completed"
    | "extraction_failed"
    | "field_updated"
    | "draft_saved"
    | "issued"
    | "exported_pdf"
    | "downloaded";
  title: string;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return bestEffortInsert("awb_events", {
    document_id: input.documentId || null,
    company_id: input.companyId,
    user_id: input.userId,
    event_type: input.eventType,
    event_title: input.title,
    event_message: input.message || null,
    metadata: input.metadata || {},
  });
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
  rawResponse: unknown = null
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const documentResponse = await fetch(`${supabaseUrl}/rest/v1/awb_documents?select=*`, {
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
  });
  const documentRows = await documentResponse.json().catch(() => []);
  const document = Array.isArray(documentRows) ? (documentRows[0] as DocumentRow | undefined) : undefined;
  if (!documentResponse.ok || !document?.id) throw new Error("Failed to create AWB document");

  let storagePath: string | null = null;
  try {
    storagePath = await uploadAwbSourceFile({
      companyId: context.companyId,
      userId: context.userId,
      documentId: document.id,
      file,
    });
    const storageResponse = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`, {
      method: "PATCH",
      headers: serviceHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ storage_path: storagePath }),
    });
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

  const fieldResponse = await fetch(`${supabaseUrl}/rest/v1/awb_fields`, {
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
  });
  if (!fieldResponse.ok) {
    await deleteAwbSourceFile(document.storage_path);
    await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${document.id}`, {
      method: "DELETE",
      headers: serviceHeaders(),
    }).catch(() => null);
    throw new Error("Failed to create AWB fields");
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
};

function historyAction(status: DocumentRow["status"]) {
  if (status === "draft") return "Draft Saved";
  if (status === "issued") return "Issued AWB";
  if (status === "failed") return "Failed";
  return "Initial Extraction";
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
  const [fieldsResponse, profilesResponse, usersResponse] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/awb_fields?document_id=in.(${documentIds.join(",")})&select=*`,
      { headers: serviceHeaders() }
    ),
    fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,full_name`, {
      headers: serviceHeaders(),
    }),
    fetch(`${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(",")})&select=id,email`, {
      headers: serviceHeaders(),
    }),
  ]);
  const fieldRows = fieldsResponse.ok ? await fieldsResponse.json().catch(() => []) : [];
  const profiles = profilesResponse.ok ? await profilesResponse.json().catch(() => []) : [];
  const users = usersResponse.ok ? await usersResponse.json().catch(() => []) : [];
  if (!Array.isArray(fieldRows)) throw new Error("Failed to load AWB history fields");

  const fieldsByDocument = new Map<string, FieldRow[]>();
  for (const field of fieldRows as FieldRow[]) {
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
    value: row.value,
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
    meta: {
      runId: document.run_id || undefined,
      totalSeconds: document.processing_time_ms ? document.processing_time_ms / 1000 : undefined,
    },
    warnings: fields
      .filter((field) => field.status !== "valid")
      .map((field) => `${field.label}: ${field.comment || "Review required"}`),
  };
}

export async function updateAwbFields(
  documentId: string,
  userId: string,
  updates: Array<{ key: string; value: string }>,
  options?: {
    companyId?: string;
    changeSource?: "user_edit" | "draft_save" | "issue_save" | "system";
  }
) {
  if (!supabaseUrl) throw new Error("AWB persistence service unavailable");
  const existingRows = await getAwbFields(documentId);
  const byKey = new Map(existingRows.map((row) => [row.key, row]));
  const editedAt = new Date().toISOString();
  let changedCount = 0;

  for (const update of updates) {
    const existing = byKey.get(update.key);
    if (!existing || existing.value === update.value) continue;
    const value = update.value.trim();
    const status: AwbFieldStatus = value ? "valid" : "missing";
    const response = await fetch(
      `${supabaseUrl}/rest/v1/awb_fields?document_id=eq.${documentId}&key=eq.${encodeURIComponent(update.key)}`,
      {
        method: "PATCH",
        headers: serviceHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          value,
          needs_review: !value,
          status,
          color: value ? "blue" : "red",
          comment: value ? "Manually reviewed" : existing.comment,
          edited_by: userId,
          edited_at: editedAt,
        }),
      }
    );
    if (!response.ok) throw new Error("Failed to update AWB field");
    changedCount += 1;

    if (options?.companyId) {
      await bestEffortInsert("awb_field_revisions", {
        document_id: documentId,
        field_id: existing.id,
        company_id: options.companyId,
        field_key: existing.key,
        field_label: existing.label,
        old_value: existing.value,
        new_value: value,
        changed_by: userId,
        changed_at: editedAt,
        ai_original_value: existing.original_value,
        ai_confidence: Number(existing.confidence) || 0,
        ai_status: existing.status,
        change_source: options.changeSource || "user_edit",
      });
      await createAwbEvent({
        documentId,
        companyId: options.companyId,
        userId,
        eventType: "field_updated",
        title: "AWB field updated",
        metadata: {
          field_key: existing.key,
          field_label: existing.label,
          change_source: options.changeSource || "user_edit",
        },
      });
    }
  }

  const fields = await getAwbFields(documentId);
  const normalizedFields = fields.map(fieldFromRow);
  const summary = summarizeAwbFields(normalizedFields);
  const status = summary.needsReview > 0 ? "review_required" : "ready_to_issue";
  const documentResponse = await fetch(`${supabaseUrl}/rest/v1/awb_documents?id=eq.${documentId}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ summary, status }),
  });
  if (!documentResponse.ok) throw new Error("Failed to update AWB document");
  return { fields: normalizedFields, summary, status, changedCount };
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

export const REQUIRED_AWB_FIELDS = [
  "awb_number",
  "shipper_name_address",
  "consignee_name_address",
  "origin_airport",
  "destination_airport",
  "issuing_carrier",
  "flight_date",
  "pieces",
  "gross_weight",
  "chargeable_weight",
  "weight_unit",
  "nature_and_quantity_of_goods",
] as const;

export function validateAwbForIssue(fields: AwbExtractedField[]) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const invalidFields = REQUIRED_AWB_FIELDS.flatMap((key) => {
    const field = byKey.get(key);
    if (field && !field.value.trim()) {
      return [{
        key,
        label: field.label,
        message: "Required value is missing.",
      }];
    }
    return [];
  });
  const warningFields = fields
    .filter((field) => field.status === "warning")
    .map((field) => ({ key: field.key, label: field.label }));
  return { invalidFields, warningFields };
}

export async function setAwbDocumentIssued(
  documentId: string,
  summary?: AwbExtractionResponse["summary"],
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
