"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { ApiQueryError, queryCode, queryMessage } from "./apiQuery";

export type NotificationPreferences = {
  awb_processed: boolean;
  processing_failures: boolean;
  mentions: boolean;
  weekly_summary: boolean;
  in_app_notifications: boolean;
};

export type WorkspaceInfo = {
  company_id: string;
  company_name: string;
  role: string;
  accepted_at: string | null;
  joined_at: string | null;
  status: string;
} | null;

export type UserProfileData = {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  phone: string;
  avatar_url: string;
  city: string;
  country: string;
  timezone: string;
  notifications: NotificationPreferences;
  workspace: WorkspaceInfo;
};

type UserProfilePayload = {
  ok?: boolean;
  data?: UserProfileData;
  code?: string;
  message?: string;
};

export const userProfileQueryKeys = {
  all: ["user-profile"] as const,
  detail: (companyId?: string | null) => ["user-profile", companyId || "none"] as const,
};

export async function fetchUserProfileQuery(companyId?: string | null) {
  const params = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  const response = await fetch(`/api/user/profile${params}`, {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as UserProfilePayload;
  if (!response.ok || payload?.ok === false || !payload.data) {
    throw new ApiQueryError(
      queryMessage(payload, "Failed to load profile."),
      response.status,
      queryCode(payload)
    );
  }
  return payload.data;
}

export function useUserProfile(
  companyId?: string | null,
  options?: Omit<
    UseQueryOptions<UserProfileData, ApiQueryError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "refetchInterval"
  >
) {
  return useQuery({
    queryKey: userProfileQueryKeys.detail(companyId),
    queryFn: () => fetchUserProfileQuery(companyId),
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}
