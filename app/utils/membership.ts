import type { Membership } from "@/app/types/membership";

export function getAcceptedMemberships(memberships: Membership[] | undefined) {
  return (memberships || []).filter((membership) => membership.accepted_at);
}

export function getMembershipForCompany(
  memberships: Membership[] | undefined,
  companyId: string | null | undefined
) {
  if (!companyId) return null;
  return (memberships || []).find((membership) => membership.company_id === companyId) || null;
}
