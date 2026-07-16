export type Membership = {
  company_id: string;
  role: string;
  accepted_at: string | null;
};

export type MembershipsSuccessResponse = {
  ok: true;
  memberships: Membership[];
};

export type MembershipsErrorResponse = {
  ok: false;
  code?: string;
  message: string;
};

export type MembershipsResponse = MembershipsSuccessResponse | MembershipsErrorResponse;
