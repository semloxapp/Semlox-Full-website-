"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { NotificationPreferences } from "./useUserProfile";
import { ApiQueryError, queryCode, queryMessage } from "./apiQuery";

type NotificationPreferencesPayload = {
  ok?: boolean;
  data?: { notifications?: NotificationPreferences };
  code?: string;
  message?: string;
};

export const userNotificationPreferencesQueryKey = ["user-notification-preferences"] as const;

export async function fetchUserNotificationPreferencesQuery() {
  const response = await fetch("/api/user/notifications", {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as NotificationPreferencesPayload;
  if (!response.ok || payload?.ok === false || !payload.data?.notifications) {
    throw new ApiQueryError(
      queryMessage(payload, "Unable to load notification preferences."),
      response.status,
      queryCode(payload)
    );
  }
  return payload.data.notifications;
}

export function useUserNotificationPreferences(
  options?: Omit<
    UseQueryOptions<NotificationPreferences, ApiQueryError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "refetchInterval"
  >
) {
  return useQuery({
    queryKey: userNotificationPreferencesQueryKey,
    queryFn: fetchUserNotificationPreferencesQuery,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}
