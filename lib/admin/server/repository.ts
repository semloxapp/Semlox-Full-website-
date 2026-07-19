import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { AdminDocumentQuery, AdminPerformanceDocumentQuery } from "./validation";
import type { FieldAnalyticsRow } from "@/lib/admin/field-intelligence";
import type { AdminAnalyticsFilterOptions, AdminAnalyticsScope } from "@/lib/admin/types";

export type AdminDocumentRow = {
  id: string;
  company_id?: string;
  uploaded_by?: string;
  file_name: string;
  status: string;
  run_id: string | null;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
  summary?: Record<string, unknown> | null;
};

export type AdminFieldRow = {
  document_id: string;
  key: string;
  label: string;
  value: string;
  original_value: string;
  confidence: number | string | null;
  needs_review: boolean;
  status: string;
  id?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

const DOCUMENT_SORT_COLUMNS = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  status: "status",
  processingTime: "processing_time_ms",
  fileName: "file_name",
} as const;

async function findSearchDocumentIds(search: string) {
  const client = createSupabaseServiceClient();
  const pattern = `%${search.replace(/[%,()]/g, "")}%`;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
  const documentSearch = isUuid
    ? client.from("awb_documents").select("id").or(`id.eq.${search},file_name.ilike.${pattern}`).limit(1000)
    : client.from("awb_documents").select("id").ilike("file_name", pattern).limit(1000);
  const [documents, awbFields] = await Promise.all([
    documentSearch,
    client.from("awb_fields").select("document_id").eq("key", "awb_number").ilike("value", pattern).limit(1000),
  ]);
  if (documents.error || awbFields.error) throw new Error("ADMIN_DOCUMENT_SEARCH_FAILED");
  return [...new Set([...(documents.data ?? []).map((row) => row.id), ...(awbFields.data ?? []).map((row) => row.document_id)])];
}

export async function getAdminDocumentPage(query: AdminDocumentQuery) {
  const client = createSupabaseServiceClient();
  let request = client
    .from("awb_documents")
    .select("id,company_id,uploaded_by,file_name,status,run_id,processing_time_ms,created_at,updated_at", { count: "exact" });
  if (query.dateFrom) request = request.gte("created_at", query.dateFrom);
  if (query.dateTo) request = request.lte("created_at", query.dateTo);
  if (query.companyId) request = request.eq("company_id", query.companyId);
  if (query.userId) request = request.eq("uploaded_by", query.userId);
  if (query.status) request = request.eq("status", query.status);
  if (query.search) {
    const matchingIds = await findSearchDocumentIds(query.search);
    if (!matchingIds.length) return { documents: [] as AdminDocumentRow[], totalItems: 0 };
    request = request.in("id", matchingIds);
  }
  const from = (query.page - 1) * query.pageSize;
  const { data, error, count } = await request
    .order(DOCUMENT_SORT_COLUMNS[query.sortBy], { ascending: query.sortOrder === "asc" })
    .range(from, from + query.pageSize - 1);
  if (error) throw new Error("ADMIN_DOCUMENT_LIST_READ_FAILED");
  return { documents: (data ?? []) as AdminDocumentRow[], totalItems: count ?? 0 };
}

export async function getAdminFieldsForDocuments(documentIds: string[]) {
  if (!documentIds.length) return [];
  const client = createSupabaseServiceClient();
  const fields: AdminFieldRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("awb_fields")
      .select("id,document_id,key,label,value,original_value,confidence,needs_review,status,created_at,updated_at")
      .in("document_id", documentIds)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error("ADMIN_DOCUMENT_FIELDS_READ_FAILED");
    fields.push(...((data ?? []) as AdminFieldRow[]));
    if ((data?.length ?? 0) < 1000) return fields;
  }
}

export async function getAdminDocumentDetailRows(id: string) {
  const client = createSupabaseServiceClient();
  const [documentResult, fieldsResult] = await Promise.all([
    client.from("awb_documents").select("id,file_name,status,run_id,processing_time_ms,created_at,updated_at,summary").eq("id", id).maybeSingle(),
    client.from("awb_fields").select("id,document_id,key,label,value,original_value,confidence,needs_review,status,created_at,updated_at").eq("document_id", id).order("page", { ascending: true }).order("key", { ascending: true }),
  ]);
  if (documentResult.error || fieldsResult.error) throw new Error("ADMIN_DOCUMENT_DETAIL_READ_FAILED");
  return { document: documentResult.data as AdminDocumentRow | null, fields: (fieldsResult.data ?? []) as AdminFieldRow[] };
}

async function readScopedDocuments(scope: Partial<AdminAnalyticsScope>): Promise<AdminDocumentRow[]> {
  const client = createSupabaseServiceClient();
  const rows: AdminDocumentRow[] = [];
  for (let from = 0; ; from += 1000) {
    let request = client.from("awb_documents").select("id,company_id,uploaded_by,file_name,status,run_id,processing_time_ms,summary,created_at,updated_at");
    if (scope.dateFrom) request = request.gte("created_at", scope.dateFrom);
    if (scope.dateTo) request = request.lte("created_at", scope.dateTo);
    if (scope.companyId) request = request.eq("company_id", scope.companyId);
    if (scope.userId) request = request.eq("uploaded_by", scope.userId);
    const { data, error } = await request.order("id", { ascending: true }).range(from, from + 999);
    if (error) throw new Error("ADMIN_AWB_DOCUMENTS_READ_FAILED");
    rows.push(...((data ?? []) as AdminDocumentRow[]));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

export async function getAdminOverviewRows(scope: Partial<AdminAnalyticsScope>) {
  const documents = await readScopedDocuments(scope);
  const fields = await getAdminFieldsForDocuments(documents.map((document) => document.id));
  return { documents, fields };
}

export async function getAdminCurrentDifferenceSourceRows(scope: Partial<AdminAnalyticsScope>) {
  const documents = await readScopedDocuments(scope);
  const fields = await getAdminFieldsForDocuments(documents.map((document) => document.id));
  return { documents, fields };
}

export async function getAdminPerformanceSourceRows(scope: Partial<AdminAnalyticsScope>) {
  return getAdminOverviewRows(scope);
}

export async function getAdminPerformanceDocumentPage(query: AdminPerformanceDocumentQuery) {
  const client = createSupabaseServiceClient();
  let request = client.from("awb_documents").select("id,company_id,uploaded_by,file_name,status,run_id,processing_time_ms,summary,created_at,updated_at", { count: "exact" });
  if (query.dateFrom) request = request.gte("created_at", query.dateFrom);
  if (query.dateTo) request = request.lte("created_at", query.dateTo);
  if (query.companyId) request = request.eq("company_id", query.companyId);
  if (query.userId) request = request.eq("uploaded_by", query.userId);
  request = query.type === "failed" ? request.eq("status", "failed") : request.not("processing_time_ms", "is", null);
  if (query.search) {
    const matchingIds = await findSearchDocumentIds(query.search);
    if (!matchingIds.length) return { documents: [] as AdminDocumentRow[], totalItems: 0 };
    request = request.in("id", matchingIds);
  }
  const from = (query.page - 1) * query.pageSize;
  const { data, error, count } = await request
    .order(DOCUMENT_SORT_COLUMNS[query.sortBy], { ascending: query.sortOrder === "asc" })
    .range(from, from + query.pageSize - 1);
  if (error) throw new Error("ADMIN_PERFORMANCE_DOCUMENTS_READ_FAILED");
  return { documents: (data ?? []) as AdminDocumentRow[], totalItems: count ?? 0 };
}

export async function getAdminFieldAnalyticsRows(scope: Partial<AdminAnalyticsScope>): Promise<FieldAnalyticsRow[]> {
  const documents = await readScopedDocuments(scope);
  return getAdminFieldsForDocuments(documents.map((document) => document.id)) as Promise<FieldAnalyticsRow[]>;
}

export async function getAdminDocumentMetadata(documentIds: string[]) {
  if (!documentIds.length) return [];
  const { data, error } = await createSupabaseServiceClient()
    .from("awb_documents")
    .select("id,file_name,status,updated_at")
    .in("id", documentIds);
  if (error) throw new Error("ADMIN_FIELD_DOCUMENTS_READ_FAILED");
  return (data ?? []) as Array<{ id: string; file_name: string | null; status: string; updated_at: string | null }>;
}

export async function getAdminAnalyticsFilterOptions(): Promise<AdminAnalyticsFilterOptions> {
  const client = createSupabaseServiceClient();
  const documents = await readScopedDocuments({ dateFrom: null, dateTo: null, companyId: null, userId: null });
  const companyIds = [...new Set(documents.map((document) => document.company_id).filter((id): id is string => Boolean(id)))];
  const userIds = [...new Set(documents.map((document) => document.uploaded_by).filter((id): id is string => Boolean(id)))];
  const [companiesResult, profilesResult, usersResult] = await Promise.all([
    companyIds.length ? client.from("companies").select("id,name").in("id", companyIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? client.from("profiles").select("id,full_name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? client.from("users").select("id,email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (companiesResult.error || profilesResult.error) throw new Error("ADMIN_FILTER_OPTIONS_READ_FAILED");
  const profileNames = new Map((profilesResult.data ?? []).map((row) => [row.id, row.full_name || ""]));
  const emails = new Map((usersResult.data ?? []).map((row) => [row.id, row.email || null]));
  return {
    companies: (companiesResult.data ?? []).map((row) => ({ id: row.id, name: row.name || "Unnamed company" })).sort((a, b) => a.name.localeCompare(b.name)),
    users: userIds.map((id) => ({
      id,
      name: profileNames.get(id) || emails.get(id) || "Unknown user",
      email: emails.get(id) ?? null,
      companyIds: [...new Set(documents.filter((document) => document.uploaded_by === id).map((document) => document.company_id).filter((companyId): companyId is string => Boolean(companyId)))],
    })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
