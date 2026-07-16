"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  Membership,
  MembershipsErrorResponse,
  MembershipsResponse,
  MembershipsSuccessResponse,
} from "@/app/types/membership";

export const membershipsQueryKey = ["auth", "memberships"] as const;

export class MembershipsQueryError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "MembershipsQueryError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchMembershipsQuery(): Promise<Membership[]> {
  const response = await fetch("/api/auth/memberships", {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<MembershipsResponse>;

  if (!response.ok || payload?.ok === false) {
    const errorPayload = payload as Partial<MembershipsErrorResponse>;
    throw new MembershipsQueryError(
      typeof errorPayload.message === "string" ? errorPayload.message : "Failed to fetch memberships",
      response.status,
      typeof errorPayload.code === "string" ? errorPayload.code : undefined
    );
  }

  const successPayload = payload as Partial<MembershipsSuccessResponse>;
  return Array.isArray(successPayload.memberships) ? successPayload.memberships : [];
}

export function membershipErrorStatus(error: unknown) {
  return error instanceof MembershipsQueryError ? error.status : 500;
}

export function useMemberships(
  options?: Omit<UseQueryOptions<Membership[], MembershipsQueryError>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: membershipsQueryKey,
    queryFn: fetchMembershipsQuery,
    ...options,
  });
}
