"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AwbExtractionResponse } from "@/lib/awb/types";
import { ApiQueryError, queryCode, queryMessage } from "./apiQuery";

export type HistoryScope = "my" | "company";
export type HistoryStatus = AwbExtractionResponse["document"]["status"];
export type HistoryStats = {
  totalDocuments: number;
  successful: number;
  failed: number;
  drafts: number;
  issued: number;
};
export type HistoryDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string | null;
  status: HistoryStatus;
  extractionMode: string;
  runId: string | null;
  pages: number;
  processingTimeMs: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  processedBy: { id: string; name: string; email: string };
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
export type HistoryResponse = {
  scope: HistoryScope;
  canViewCompanyHistory: boolean;
  role: string;
  stats: HistoryStats;
  documents: HistoryDocument[];
};
export type HistoryFilters = {
  companyId: string | null | undefined;
  scope: HistoryScope;
  search: string;
  status: string;
  action: string;
  range: string;
  from: string;
  to: string;
};

type HistoryPayload = {
  ok?: boolean;
  data?: HistoryResponse;
  code?: string;
  message?: string;
};

export const EMPTY_HISTORY_STATS: HistoryStats = {
  totalDocuments: 0,
  successful: 0,
  failed: 0,
  drafts: 0,
  issued: 0,
};

export const awbHistoryQueryKeys = {
  all: ["awb-history"] as const,
  list: (filters: HistoryFilters) =>
    [
      "awb-history",
      "list",
      filters.companyId || "none",
      filters.scope,
      filters.search.trim(),
      filters.status,
      filters.action,
      filters.range,
      filters.from,
      filters.to,
    ] as const,
};

export async function fetchAwbHistoryQuery(filters: HistoryFilters) {
  if (!filters.companyId) {
    return {
      scope: filters.scope,
      canViewCompanyHistory: false,
      role: "",
      stats: EMPTY_HISTORY_STATS,
      documents: [],
    } satisfies HistoryResponse;
  }

  const params = new URLSearchParams({ companyId: filters.companyId, scope: filters.scope });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.range !== "all") params.set("range", filters.range);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const response = await fetch(`/api/awb/history?${params.toString()}`, {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as HistoryPayload;
  if (!response.ok || payload?.ok === false || !payload.data) {
    throw new ApiQueryError(
      queryMessage(payload, "Unable to load AWB history."),
      response.status,
      queryCode(payload)
    );
  }
  return payload.data;
}

export function useAwbHistory(
  filters: HistoryFilters,
  options?: Omit<
    UseQueryOptions<HistoryResponse, ApiQueryError>,
    "queryKey" | "queryFn" | "enabled" | "staleTime" | "gcTime" | "refetchInterval"
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: awbHistoryQueryKeys.list(filters),
    queryFn: () => fetchAwbHistoryQuery(filters),
    enabled: Boolean(filters.companyId) && (options?.enabled ?? true),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}
