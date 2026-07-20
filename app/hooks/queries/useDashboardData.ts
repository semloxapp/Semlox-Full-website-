"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { ApiQueryError, queryCode, queryMessage } from "./apiQuery";

export type DashboardScope = "user" | "company";
export type DashboardRange = "7d" | "30d" | "90d";
export type DashboardDocument = {
  documentId: string;
  awbNumber: string;
  fileName: string;
  processedBy: string;
  status: string;
  fields: { total: number; captured: number; warnings: number; corrected: number };
  updatedAt: string;
};
export type DashboardActivity = {
  id: string;
  documentId: string | null;
  type: string;
  title: string;
  message: string | null;
  createdAt: string;
  user: string;
};
export type DashboardTeamRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  uploaded: number;
  drafts: number;
  issued: number;
  failed: number;
  fieldsCorrected: number;
  lastActive: string | null;
};
export type DashboardData = {
  scope: DashboardScope;
  range: DashboardRange;
  role: string;
  canViewCompanyDashboard?: boolean;
  stats: Record<string, number>;
  trend: Array<Record<string, string | number>>;
  statusSplit: Array<{ name: string; value: number; color: string }>;
  pendingWork?: DashboardDocument[];
  recentActivity?: DashboardActivity[];
  teamActivity?: DashboardTeamRow[];
  activeDocuments?: DashboardDocument[];
  exceptions?: DashboardDocument[];
};

type DashboardPayload = {
  ok?: boolean;
  data?: DashboardData;
  code?: string;
  message?: string;
};

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  detail: (scope: DashboardScope, companyId: string, range: DashboardRange) =>
    ["dashboard", scope, companyId, range] as const,
};

export async function fetchDashboardDataQuery(
  scope: DashboardScope,
  companyId: string,
  range: DashboardRange
) {
  const response = await fetch(
    `/api/dashboard/${scope}?companyId=${encodeURIComponent(companyId)}&range=${range}`,
    { credentials: "include", cache: "no-store" }
  );
  const payload = (await response.json().catch(() => ({}))) as DashboardPayload;
  if (!response.ok || payload?.ok === false || !payload.data) {
    throw new ApiQueryError(
      queryMessage(payload, "Unable to load dashboard."),
      response.status,
      queryCode(payload)
    );
  }
  return payload.data;
}

export function useDashboardData(
  scope: DashboardScope,
  companyId: string | null | undefined,
  range: DashboardRange,
  options?: Omit<
    UseQueryOptions<DashboardData, ApiQueryError>,
    "queryKey" | "queryFn" | "enabled" | "staleTime" | "gcTime" | "refetchInterval"
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: companyId
      ? dashboardQueryKeys.detail(scope, companyId, range)
      : ["dashboard", scope, "none", range],
    queryFn: () => fetchDashboardDataQuery(scope, companyId as string, range),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}
