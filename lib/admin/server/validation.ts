import type { AdminAnalyticsScope, AdminCurrentDifferenceSortField, AdminDocumentSortField, AdminFieldIntelligenceSortField, AdminFieldIntelligenceStatusFilter, AdminPerformanceDocumentListType, AdminPerformanceDocumentSortField, AdminSortOrder } from "@/lib/admin/types";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { CURRENT_AWB_FIELD_KEYS } from "../../awb/fieldRegistry.ts";

export const ADMIN_ANALYTICS_MAX_PAGE_SIZE = 100;
export const ADMIN_DOCUMENT_STATUSES = ["draft", "failed", "issued", "review_required"] as const;
export const ADMIN_DOCUMENT_SORT_FIELDS = ["createdAt", "updatedAt", "status", "processingTime", "fileName"] as const;

export type AdminDocumentQuery = Partial<AdminAnalyticsScope> & {
  page: number;
  pageSize: number;
  search: string | null;
  status: string | null;
  sortBy: AdminDocumentSortField;
  sortOrder: AdminSortOrder;
};

export type AdminValidationResult<T> = { ok: true; value: T } | { ok: false; code: "INVALID_QUERY" | "INVALID_DOCUMENT_ID" | "INVALID_FIELD_KEY"; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAdminAnalyticsScope(params: URLSearchParams): AdminValidationResult<AdminAnalyticsScope> {
  const dateFrom = params.get("dateFrom")?.trim() || null;
  const dateTo = params.get("dateTo")?.trim() || null;
  const companyId = params.get("companyId")?.trim() || null;
  const userId = params.get("userId")?.trim() || null;
  if (!isValidAdminDateRange(dateFrom, dateTo)) return { ok: false, code: "INVALID_QUERY", message: "The analytics date range is invalid." };
  if (companyId && !UUID_PATTERN.test(companyId)) return { ok: false, code: "INVALID_QUERY", message: "Company filter is invalid." };
  if (userId && !UUID_PATTERN.test(userId)) return { ok: false, code: "INVALID_QUERY", message: "User filter is invalid." };
  return { ok: true, value: { dateFrom, dateTo, companyId, userId } };
}

export function parseAdminDocumentQuery(params: URLSearchParams): AdminValidationResult<AdminDocumentQuery> {
  const scope = parseAdminAnalyticsScope(params);
  if (!scope.ok) return scope;
  const pageRaw = params.get("page") ?? "1";
  const pageSizeRaw = params.get("pageSize") ?? "25";
  if (!/^\d+$/.test(pageRaw) || Number(pageRaw) < 1) return { ok: false, code: "INVALID_QUERY", message: "Page must be a positive integer." };
  if (!/^\d+$/.test(pageSizeRaw) || Number(pageSizeRaw) < 1 || Number(pageSizeRaw) > ADMIN_ANALYTICS_MAX_PAGE_SIZE) return { ok: false, code: "INVALID_QUERY", message: `Page size must be between 1 and ${ADMIN_ANALYTICS_MAX_PAGE_SIZE}.` };

  const search = params.get("search")?.trim() || null;
  if (search && search.length > 100) return { ok: false, code: "INVALID_QUERY", message: "Search must be 100 characters or fewer." };
  const status = params.get("status")?.trim().toLowerCase() || null;
  if (status && !ADMIN_DOCUMENT_STATUSES.includes(status as typeof ADMIN_DOCUMENT_STATUSES[number])) return { ok: false, code: "INVALID_QUERY", message: "Status filter is not supported." };
  const sortBy = (params.get("sortBy") ?? "updatedAt") as AdminDocumentSortField;
  if (!ADMIN_DOCUMENT_SORT_FIELDS.includes(sortBy)) return { ok: false, code: "INVALID_QUERY", message: "Sort field is not supported." };
  const sortOrder = (params.get("sortOrder") ?? "desc") as AdminSortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") return { ok: false, code: "INVALID_QUERY", message: "Sort order must be asc or desc." };
  return { ok: true, value: { ...scope.value, page: Number(pageRaw), pageSize: Number(pageSizeRaw), search, status, sortBy, sortOrder } };
}

export function validateAdminDocumentId(id: string): AdminValidationResult<string> {
  return UUID_PATTERN.test(id) ? { ok: true, value: id } : { ok: false, code: "INVALID_DOCUMENT_ID", message: "Document ID is invalid." };
}

export type AdminFieldIntelligenceQuery = Partial<AdminAnalyticsScope> & { search: string | null; status: AdminFieldIntelligenceStatusFilter | null; sortBy: AdminFieldIntelligenceSortField; sortOrder: AdminSortOrder };
const FIELD_STATUSES = ["valid", "warning", "review", "missing", "needs_review", "edited"] as const;
const FIELD_SORT_FIELDS = ["fieldLabel", "occurrenceCount", "documentCount", "coverageRate", "averageConfidence", "needsReviewRate", "missingRate", "editedFieldRate"] as const;

export function parseAdminFieldIntelligenceQuery(params: URLSearchParams): AdminValidationResult<AdminFieldIntelligenceQuery> {
  const scope = parseAdminAnalyticsScope(params);
  if (!scope.ok) return scope;
  const search = params.get("search")?.trim() || null;
  if (search && search.length > 100) return { ok: false, code: "INVALID_QUERY", message: "Search must be 100 characters or fewer." };
  const status = params.get("status")?.trim().toLowerCase() || null;
  if (status && !FIELD_STATUSES.includes(status as AdminFieldIntelligenceStatusFilter)) return { ok: false, code: "INVALID_QUERY", message: "Field status filter is not supported." };
  const sortBy = (params.get("sortBy") ?? "editedFieldRate") as AdminFieldIntelligenceSortField;
  if (!FIELD_SORT_FIELDS.includes(sortBy)) return { ok: false, code: "INVALID_QUERY", message: "Field sort is not supported." };
  const sortOrder = (params.get("sortOrder") ?? "desc") as AdminSortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") return { ok: false, code: "INVALID_QUERY", message: "Sort order must be asc or desc." };
  return { ok: true, value: { ...scope.value, search, status: status as AdminFieldIntelligenceStatusFilter | null, sortBy, sortOrder } };
}

export function validateAdminFieldKey(value: string): AdminValidationResult<string> {
  let decoded: string;
  try { decoded = decodeURIComponent(value).trim().toLowerCase(); } catch { return { ok: false, code: "INVALID_FIELD_KEY", message: "Field key is invalid." }; }
  if (!decoded || decoded.length > 100 || !/^[a-z0-9_]+$/.test(decoded)) return { ok: false, code: "INVALID_FIELD_KEY", message: "Field key is invalid." };
  return { ok: true, value: decoded };
}

export type AdminCurrentDifferencesQuery = Partial<AdminAnalyticsScope> & { page: number; pageSize: number; search: string | null; fieldKey: string | null; fieldStatus: string | null; documentStatus: string | null; needsReview: boolean | null; includeLegacy: boolean; sortBy: AdminCurrentDifferenceSortField; sortOrder: AdminSortOrder };
const CURRENT_DIFFERENCE_SORT_FIELDS = ["fieldUpdatedAt", "documentUpdatedAt", "confidence", "fieldLabel", "documentStatus", "fieldStatus"] as const;
const CURRENT_DIFFERENCE_FIELD_STATUSES = ["valid", "warning", "review", "missing"] as const;

export function parseAdminCurrentDifferencesQuery(params: URLSearchParams): AdminValidationResult<AdminCurrentDifferencesQuery> {
  const scope = parseAdminAnalyticsScope(params);
  if (!scope.ok) return scope;
  const pageRaw = params.get("page") ?? "1";
  const pageSizeRaw = params.get("pageSize") ?? "25";
  if (!/^\d+$/.test(pageRaw) || Number(pageRaw) < 1) return { ok: false, code: "INVALID_QUERY", message: "Page must be a positive integer." };
  if (!/^\d+$/.test(pageSizeRaw) || Number(pageSizeRaw) < 1 || Number(pageSizeRaw) > ADMIN_ANALYTICS_MAX_PAGE_SIZE) return { ok: false, code: "INVALID_QUERY", message: `Page size must be between 1 and ${ADMIN_ANALYTICS_MAX_PAGE_SIZE}.` };
  const search = params.get("search")?.trim() || null;
  if (search && search.length > 100) return { ok: false, code: "INVALID_QUERY", message: "Search must be 100 characters or fewer." };
  const fieldKey = params.get("fieldKey")?.trim().toLowerCase() || null;
  const includeLegacy = params.get("includeLegacy") === "true";
  if (fieldKey && !CURRENT_AWB_FIELD_KEYS.has(fieldKey) && !(includeLegacy && fieldKey === "flight_date")) return { ok: false, code: "INVALID_QUERY", message: "Field filter is not supported." };
  const fieldStatus = params.get("fieldStatus")?.trim().toLowerCase() || null;
  if (fieldStatus && !CURRENT_DIFFERENCE_FIELD_STATUSES.includes(fieldStatus as typeof CURRENT_DIFFERENCE_FIELD_STATUSES[number])) return { ok: false, code: "INVALID_QUERY", message: "Field status filter is not supported." };
  const documentStatus = params.get("documentStatus")?.trim().toLowerCase() || null;
  if (documentStatus && !ADMIN_DOCUMENT_STATUSES.includes(documentStatus as typeof ADMIN_DOCUMENT_STATUSES[number])) return { ok: false, code: "INVALID_QUERY", message: "Document status filter is not supported." };
  const reviewRaw = params.get("needsReview");
  if (reviewRaw !== null && reviewRaw !== "true" && reviewRaw !== "false") return { ok: false, code: "INVALID_QUERY", message: "Needs-review filter must be true or false." };
  const legacyRaw = params.get("includeLegacy");
  if (legacyRaw !== null && legacyRaw !== "true" && legacyRaw !== "false") return { ok: false, code: "INVALID_QUERY", message: "Legacy filter must be true or false." };
  const sortBy = (params.get("sortBy") ?? "fieldUpdatedAt") as AdminCurrentDifferenceSortField;
  if (!CURRENT_DIFFERENCE_SORT_FIELDS.includes(sortBy)) return { ok: false, code: "INVALID_QUERY", message: "Sort field is not supported." };
  const sortOrder = (params.get("sortOrder") ?? "desc") as AdminSortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") return { ok: false, code: "INVALID_QUERY", message: "Sort order must be asc or desc." };
  return { ok: true, value: { ...scope.value, page: Number(pageRaw), pageSize: Number(pageSizeRaw), search, fieldKey, fieldStatus, documentStatus, needsReview: reviewRaw === null ? null : reviewRaw === "true", includeLegacy, sortBy, sortOrder } };
}

export function validateAdminFieldId(id: string): AdminValidationResult<string> {
  return UUID_PATTERN.test(id) ? { ok: true, value: id } : { ok: false, code: "INVALID_FIELD_KEY", message: "Field ID is invalid." };
}

export type AdminPerformanceDocumentQuery = Partial<AdminAnalyticsScope> & { type: AdminPerformanceDocumentListType; page: number; pageSize: number; search: string | null; sortBy: AdminPerformanceDocumentSortField; sortOrder: AdminSortOrder };
const PERFORMANCE_LIST_TYPES = ["slow", "failed"] as const;
const PERFORMANCE_SORT_FIELDS = ["processingTime", "createdAt", "updatedAt", "fileName", "status"] as const;
export function parseAdminPerformanceDocumentQuery(params: URLSearchParams): AdminValidationResult<AdminPerformanceDocumentQuery> {
  const scope = parseAdminAnalyticsScope(params);
  if (!scope.ok) return scope;
  const type = (params.get("type") ?? "slow") as AdminPerformanceDocumentListType;
  if (!PERFORMANCE_LIST_TYPES.includes(type)) return { ok: false, code: "INVALID_QUERY", message: "Performance list type is not supported." };
  const pageRaw = params.get("page") ?? "1";
  const pageSizeRaw = params.get("pageSize") ?? "25";
  if (!/^\d+$/.test(pageRaw) || Number(pageRaw) < 1) return { ok: false, code: "INVALID_QUERY", message: "Page must be a positive integer." };
  if (!/^\d+$/.test(pageSizeRaw) || Number(pageSizeRaw) < 1 || Number(pageSizeRaw) > ADMIN_ANALYTICS_MAX_PAGE_SIZE) return { ok: false, code: "INVALID_QUERY", message: `Page size must be between 1 and ${ADMIN_ANALYTICS_MAX_PAGE_SIZE}.` };
  const search = params.get("search")?.trim() || null;
  if (search && search.length > 100) return { ok: false, code: "INVALID_QUERY", message: "Search must be 100 characters or fewer." };
  const defaultSort = type === "slow" ? "processingTime" : "updatedAt";
  const sortBy = (params.get("sortBy") ?? defaultSort) as AdminPerformanceDocumentSortField;
  if (!PERFORMANCE_SORT_FIELDS.includes(sortBy)) return { ok: false, code: "INVALID_QUERY", message: "Performance sort field is not supported." };
  const sortOrder = (params.get("sortOrder") ?? "desc") as AdminSortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") return { ok: false, code: "INVALID_QUERY", message: "Sort order must be asc or desc." };
  return { ok: true, value: { ...scope.value, type, page: Number(pageRaw), pageSize: Number(pageSizeRaw), search, sortBy, sortOrder } };
}

export function isValidAdminDateRange(dateFrom?: string | null, dateTo?: string | null) {
  if (!dateFrom && !dateTo) return true;
  const from = dateFrom ? Date.parse(dateFrom) : Number.NEGATIVE_INFINITY;
  const to = dateTo ? Date.parse(dateTo) : Number.POSITIVE_INFINITY;
  return Number.isFinite(from) || from === Number.NEGATIVE_INFINITY
    ? (Number.isFinite(to) || to === Number.POSITIVE_INFINITY) && from <= to
    : false;
}
