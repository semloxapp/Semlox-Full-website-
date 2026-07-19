import type { AdminAnalyticsFilterOptions, AdminAnalyticsScope, AdminApiError, AdminApiSuccess, AdminCurrentDifferenceDetail, AdminCurrentDifferencesResponse, AdminCurrentDifferenceSortField, AdminDocumentDetail, AdminDocumentListResponse, AdminDocumentSortField, AdminFieldIntelligenceDetail, AdminFieldIntelligenceResponse, AdminFieldIntelligenceSortField, AdminFieldIntelligenceStatusFilter, AdminOverviewResponse, AdminPerformanceDocumentListResponse, AdminPerformanceDocumentListType, AdminPerformanceDocumentSortField, AdminPerformanceResponse, AdminSortOrder } from "./types";

export class AdminApiClientError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

const withRequestTimeout = (signal?: AbortSignal) => signal
  ? AbortSignal.any([signal, AbortSignal.timeout(20_000)])
  : AbortSignal.timeout(20_000);

const addScope = (search: URLSearchParams, scope?: AdminAnalyticsScope) => {
  if (scope?.dateFrom) search.set("dateFrom", scope.dateFrom);
  if (scope?.dateTo) search.set("dateTo", scope.dateTo);
  if (scope?.companyId) search.set("companyId", scope.companyId);
  if (scope?.userId) search.set("userId", scope.userId);
  return search;
};

export async function getAdminOverview(scope?: AdminAnalyticsScope, signal?: AbortSignal): Promise<AdminOverviewResponse> {
  const search = addScope(new URLSearchParams(), scope);
  const response = await fetch(`/api/admin/analytics/overview?${search}`, { credentials: "include", cache: "no-store", signal: withRequestTimeout(signal) });
  const body = await response.json().catch(() => null) as AdminApiSuccess<AdminOverviewResponse> | AdminApiError | null;
  if (!response.ok || !body || !body.ok) {
    const error = body && !body.ok ? body : null;
    throw new AdminApiClientError(error?.code ?? "ANALYTICS_REQUEST_FAILED", error?.message ?? "Analytics data could not be loaded.", response.status);
  }
  return body.data;
}

async function getAdminData<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", signal: withRequestTimeout(signal) });
  const body = await response.json().catch(() => null) as AdminApiSuccess<T> | AdminApiError | null;
  if (!response.ok || !body || !body.ok) {
    const error = body && !body.ok ? body : null;
    throw new AdminApiClientError(error?.code ?? "ADMIN_REQUEST_FAILED", error?.message ?? "The requested data could not be loaded.", response.status);
  }
  return body.data;
}

export type AdminDocumentListParams = AdminAnalyticsScope & { page: number; pageSize: number; search?: string; status?: string; sortBy: AdminDocumentSortField; sortOrder: AdminSortOrder };

export function getAdminDocuments(params: AdminDocumentListParams, signal?: AbortSignal) {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), sortBy: params.sortBy, sortOrder: params.sortOrder });
  addScope(search, params);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.status) search.set("status", params.status);
  return getAdminData<AdminDocumentListResponse>(`/api/admin/analytics/documents?${search}`, signal);
}

export function getAdminDocumentById(documentId: string, signal?: AbortSignal) {
  return getAdminData<AdminDocumentDetail>(`/api/admin/analytics/documents/${encodeURIComponent(documentId)}`, signal);
}

export type AdminFieldIntelligenceParams = AdminAnalyticsScope & { search?: string; status?: AdminFieldIntelligenceStatusFilter | ""; sortBy: AdminFieldIntelligenceSortField; sortOrder: AdminSortOrder };

export function getAdminFieldIntelligence(params: AdminFieldIntelligenceParams, signal?: AbortSignal) {
  const search = new URLSearchParams({ sortBy: params.sortBy, sortOrder: params.sortOrder });
  addScope(search, params);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.status) search.set("status", params.status);
  return getAdminData<AdminFieldIntelligenceResponse>(`/api/admin/analytics/field-intelligence?${search}`, signal);
}

export function getAdminFieldIntelligenceDetail(fieldKey: string, signal?: AbortSignal) {
  return getAdminData<AdminFieldIntelligenceDetail>(`/api/admin/analytics/field-intelligence/${encodeURIComponent(fieldKey)}`, signal);
}

export type AdminCurrentDifferencesParams = AdminAnalyticsScope & { page: number; pageSize: number; search?: string; fieldKey?: string; fieldStatus?: string; documentStatus?: string; needsReview?: boolean | null; includeLegacy?: boolean; sortBy: AdminCurrentDifferenceSortField; sortOrder: AdminSortOrder };
export function getAdminCurrentDifferences(params: AdminCurrentDifferencesParams, signal?: AbortSignal) {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), sortBy: params.sortBy, sortOrder: params.sortOrder, includeLegacy: String(Boolean(params.includeLegacy)) });
  addScope(search, params);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.fieldKey) search.set("fieldKey", params.fieldKey);
  if (params.fieldStatus) search.set("fieldStatus", params.fieldStatus);
  if (params.documentStatus) search.set("documentStatus", params.documentStatus);
  if (params.needsReview !== null && params.needsReview !== undefined) search.set("needsReview", String(params.needsReview));
  return getAdminData<AdminCurrentDifferencesResponse>(`/api/admin/analytics/current-differences?${search}`, signal);
}
export function getAdminCurrentDifferenceDetail(fieldId: string, signal?: AbortSignal) {
  return getAdminData<AdminCurrentDifferenceDetail>(`/api/admin/analytics/current-differences/${encodeURIComponent(fieldId)}`, signal);
}

export function getAdminPerformance(scope?: AdminAnalyticsScope, signal?: AbortSignal) {
  return getAdminData<AdminPerformanceResponse>(`/api/admin/analytics/performance?${addScope(new URLSearchParams(), scope)}`, signal);
}
export type AdminPerformanceDocumentsParams = AdminAnalyticsScope & { type: AdminPerformanceDocumentListType; page: number; pageSize: number; search?: string; sortBy: AdminPerformanceDocumentSortField; sortOrder: AdminSortOrder };
export function getAdminPerformanceDocuments(params: AdminPerformanceDocumentsParams, signal?: AbortSignal) {
  const search = new URLSearchParams({ type: params.type, page: String(params.page), pageSize: String(params.pageSize), sortBy: params.sortBy, sortOrder: params.sortOrder });
  addScope(search, params);
  if (params.search?.trim()) search.set("search", params.search.trim());
  return getAdminData<AdminPerformanceDocumentListResponse>(`/api/admin/analytics/performance/documents?${search}`, signal);
}

export function getAdminAnalyticsFilterOptions(signal?: AbortSignal) {
  return getAdminData<AdminAnalyticsFilterOptions>("/api/admin/analytics/filter-options", signal);
}
