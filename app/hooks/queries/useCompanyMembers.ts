"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { ApiQueryError, queryCode, queryMessage } from "./apiQuery";

export type CompanyMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
  last_active?: string | null;
};

type CompanyMembersPayload = {
  ok?: boolean;
  data?: CompanyMember[];
  code?: string;
  message?: string;
};

export const companyMembersQueryKeys = {
  all: ["company-members"] as const,
  detail: (companyId: string | null | undefined) => ["company-members", companyId || "none"] as const,
};

export async function fetchCompanyMembersQuery(companyId: string) {
  const response = await fetch(`/api/company/members?companyId=${encodeURIComponent(companyId)}`, {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as CompanyMembersPayload;
  if (!response.ok || payload?.ok === false) {
    throw new ApiQueryError(
      queryMessage(payload, response.status === 401 ? "Your session expired. Please sign in again." : "Unable to load team members. Try again."),
      response.status,
      queryCode(payload)
    );
  }
  return Array.isArray(payload.data) ? payload.data : [];
}

export function useCompanyMembersQuery(
  companyId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<CompanyMember[], ApiQueryError>,
    "queryKey" | "queryFn" | "enabled" | "staleTime" | "gcTime" | "refetchInterval"
  > & { enabled?: boolean }
) {
  return useQuery({
    queryKey: companyMembersQueryKeys.detail(companyId),
    queryFn: () => fetchCompanyMembersQuery(companyId as string),
    enabled: Boolean(companyId) && (options?.enabled ?? true),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: (failureCount, error) => error.status !== 401 && failureCount < 1,
    ...options,
  });
}
