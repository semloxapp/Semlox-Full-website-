"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useCompany } from "@/app/context/CompanyContext";
import { membershipsQueryKey, useMemberships } from "@/app/hooks/queries/useMemberships";

async function acceptInvite(companyId: string) {
  const response = await fetch("/api/auth/accept-invite", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "Invite acceptance failed. Please contact your company admin."
    );
  }
  return companyId;
}

export default function DashboardMembershipBootstrap() {
  const queryClient = useQueryClient();
  const { setSelectedCompanyId } = useCompany();
  const attemptedCompanyIdsRef = useRef<Set<string>>(new Set());
  const membershipsQuery = useMemberships();
  const acceptInviteMutation = useMutation({
    mutationFn: acceptInvite,
    retry: false,
    onSuccess: async (companyId) => {
      await queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
      setSelectedCompanyId(companyId, true);
    },
  });

  useEffect(() => {
    const memberships = membershipsQuery.data;
    if (!memberships || acceptInviteMutation.isPending) return;

    const pending = memberships.filter((membership) => !membership.accepted_at);
    if (pending.length !== 1) return;

    const companyId = pending[0].company_id;
    if (attemptedCompanyIdsRef.current.has(companyId)) return;

    attemptedCompanyIdsRef.current.add(companyId);
    acceptInviteMutation.mutate(companyId);
  }, [acceptInviteMutation, membershipsQuery.data]);

  return null;
}
