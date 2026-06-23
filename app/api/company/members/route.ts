import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { extractBearerTokenFromRequest, getUserFromAccessToken, getMembershipsByUserId, getMembershipForUserAndCompany } from "@/lib/auth";
import { createNotificationsSafely, getCompanyName, getUserLabel } from "@/lib/notifications";
import { createClient } from "@supabase/supabase-js";

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const serviceHeaders = () => ({
  apikey: supabaseServiceRoleKey as string,
  Authorization: `Bearer ${supabaseServiceRoleKey}`,
  "Content-Type": "application/json",
});

const validRoles = new Set(["owner", "admin", "manager", "operator", "viewer"]);

async function requireTeamManager(request: Request, companyId: string) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { error: jsonResponse({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }, 500) };
  }

  const token = extractBearerTokenFromRequest(request);
  if (!token) return { error: jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, 401) };

  const user = await getUserFromAccessToken(token);
  if (!user?.id) return { error: jsonResponse({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }, 401) };

  const membership = await getMembershipForUserAndCompany(user.id, companyId);
  const role = String(membership?.role || "").toLowerCase();
  if (!membership || (role !== "owner" && role !== "admin")) {
    return { error: jsonResponse({ ok: false, code: "FORBIDDEN", message: "Only owners and admins can manage team members." }, 403) };
  }

  return { user };
}

async function getTargetMembership(companyId: string, userId: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&user_id=eq.${userId}`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  if (!resp.ok) return null;
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function countOwners(companyId: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&role=eq.owner&select=user_id`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  if (!resp.ok) return 0;
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) ? rows.length : 0;
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const token = extractBearerTokenFromRequest(request);
  if (!token) return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const user = await getUserFromAccessToken(token);
  if (!user?.id) return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const url = new URL(request.url);
  const qCompanyId = url.searchParams.get("companyId");

  // Determine companyId: prefer query param, otherwise derive if user has single owner/admin membership
  let companyId = qCompanyId || null;
  try {
    if (!companyId) {
      const memberships = await getMembershipsByUserId(user.id);
      const allowed = (memberships || []).filter((m: any) => {
        const roleStr = (m.role || "").toLowerCase();
        return roleStr === "owner" || roleStr === "admin";
      });
      if (allowed.length === 1) companyId = allowed[0].company_id;
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[company-members] membership derive failed", e);
  }

  if (!companyId) return new Response(JSON.stringify({ ok: false, code: "MISSING_FIELDS", message: "companyId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

  // Verify the requester is a member of the company
  try {
    const membership = await getMembershipForUserAndCompany(user.id, companyId);
    if (!membership) return new Response(JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Access denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
    const role = String(membership.role || "").toLowerCase();
    if (role !== "owner" && role !== "admin") {
      return new Response(JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Only owners and admins can manage team members." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[company-members] membership verify failed", e);
    return new Response(JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Access denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Fetch memberships for the target company
    const memResp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    });
    if (!memResp.ok) {
      if (process.env.NODE_ENV !== "production") console.log("[company-members] memberships fetch failed", memResp.status);
      return new Response(JSON.stringify({ ok: false, code: "DATA_FETCH_FAILED", message: "Failed to load members" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const memberships = await memResp.json().catch(() => []);

    const userIds = Array.from(new Set((memberships || []).map((m: any) => m.user_id).filter(Boolean)));

    // Fetch profiles and users in batch
    const profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,full_name`, {
      method: "GET",
      headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
    });
    const profiles = profilesResp.ok ? await profilesResp.json().catch(() => []) : [];

    const usersResp = await fetch(`${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(",")})&select=id,email,raw_user_meta_data,created_at`, {
      method: "GET",
      headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${supabaseServiceRoleKey}` },
    });
    const users = usersResp.ok ? await usersResp.json().catch(() => []) : [];

    const byProfile: Record<string, any> = {};
    for (const p of profiles) byProfile[p.id] = p;
    const byUser: Record<string, any> = {};
    for (const u of users) byUser[u.id] = u;

    const out = (memberships || []).map((m: any) => {
      const uid = m.user_id;
      const profile = byProfile[uid] || {};
      const userRec = byUser[uid] || {};
      let status = "active";
      if (!m.accepted_at && m.invited_at) status = "invited";
      // disabled heuristics (if user has raw_user_meta_data or metadata flag)
      if (userRec?.raw_user_meta_data && userRec.raw_user_meta_data?.disabled) status = "disabled";
      return {
        user_id: uid,
        email: userRec.email || null,
        full_name: profile.full_name || null,
        role: m.role,
        status,
        invited_at: m.invited_at || null,
        accepted_at: m.accepted_at || null,
        created_at: userRec.created_at || m.created_at || null,
      };
    });

    return new Response(JSON.stringify({ ok: true, data: out, message: "Team members loaded." }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[company-members] unexpected error", e);
    return new Response(JSON.stringify({ ok: false, code: "SERVER_ERROR", message: "Failed to load members" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PATCH(request: Request) {
  const { companyId, userId, role } = await request.json().catch(() => ({}));
  const nextRole = String(role || "").toLowerCase();
  if (!companyId || !userId || !validRoles.has(nextRole)) {
    return jsonResponse({ ok: false, code: "MISSING_FIELDS", message: "Please provide a valid member and role." }, 400);
  }

  const auth = await requireTeamManager(request, companyId);
  if (auth.error) return auth.error;

  const current = await getTargetMembership(companyId, userId);
  if (!current) return jsonResponse({ ok: false, code: "NOT_FOUND", message: "Team member not found." }, 404);
  const previousRole = String(current.role || "").toLowerCase();

  if (previousRole === "owner" && nextRole !== "owner" && (await countOwners(companyId)) <= 1) {
    return jsonResponse({ ok: false, code: "LAST_OWNER", message: "You cannot demote the last owner." }, 409);
  }

  const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&user_id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({ role: nextRole }),
  });

  if (!resp.ok) {
    return jsonResponse({ ok: false, code: "ROLE_UPDATE_FAILED", message: "Unable to update member role. Try again." }, resp.status);
  }

  const data = await resp.json().catch(() => []);
  if (previousRole !== nextRole) {
    const [companyName, userLabel] = await Promise.all([
      getCompanyName(companyId),
      getUserLabel(userId),
    ]);
    await createNotificationsSafely([
      {
        companyId,
        audience: "company_admins",
        type: "role_changed",
        category: "team",
        severity: "info",
        title: "Member role updated",
        message: `${userLabel} role changed from ${previousRole} to ${nextRole}.`,
        data: { href: "/dashboard/settings" },
      },
      {
        companyId,
        userId,
        audience: "user",
        type: "role_changed",
        category: "team",
        severity: "info",
        title: "Your role was updated",
        message: `Your role in ${companyName || "the workspace"} changed to ${nextRole}.`,
        data: { href: "/dashboard/settings" },
      },
    ], "company-members-role");
  }
  return jsonResponse({ ok: true, data: Array.isArray(data) ? data[0] : data, message: "Role updated." }, 200);
}

export async function DELETE(request: Request) {
  const { companyId, userId } = await request.json().catch(() => ({}));
  if (!companyId || !userId) {
    return jsonResponse({ ok: false, code: "MISSING_FIELDS", message: "Please provide a valid team member." }, 400);
  }

  const auth = await requireTeamManager(request, companyId);
  if (auth.error) return auth.error;

  const current = await getTargetMembership(companyId, userId);
  if (!current) return jsonResponse({ ok: false, code: "NOT_FOUND", message: "Team member not found." }, 404);

  if (String(current.role || "").toLowerCase() === "owner" && (await countOwners(companyId)) <= 1) {
    return jsonResponse({ ok: false, code: "LAST_OWNER", message: "You cannot remove the last owner." }, 409);
  }

  const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&user_id=eq.${userId}`, {
    method: "DELETE",
    headers: serviceHeaders(),
  });

  if (!resp.ok) {
    return jsonResponse({ ok: false, code: "REMOVE_FAILED", message: "Unable to remove team member. Try again." }, resp.status);
  }

  const [companyName, userLabel] = await Promise.all([
    getCompanyName(companyId),
    getUserLabel(userId),
  ]);
  await createNotificationsSafely([
    {
      companyId,
      audience: "company_admins",
      type: "member_removed",
      category: "team",
      severity: "warning",
      title: "Member removed",
      message: `${userLabel} was removed from the workspace.`,
      data: { href: "/dashboard/settings" },
    },
    {
      companyId,
      userId,
      audience: "user",
      type: "workspace_access_removed",
      category: "team",
      severity: "warning",
      title: "Workspace access removed",
      message: `Your access to ${companyName || "the workspace"} was removed.`,
    },
  ], "company-members-remove");

  return jsonResponse({ ok: true, message: "Member removed." }, 200);
}

export async function POST(request: Request) {
  const { action, companyId, userId } = await request.json().catch(() => ({}));
  if (action !== "resend" || !companyId || !userId) {
    return jsonResponse({ ok: false, code: "MISSING_FIELDS", message: "Please provide a valid invited member." }, 400);
  }

  const auth = await requireTeamManager(request, companyId);
  if (auth.error) return auth.error;

  const current = await getTargetMembership(companyId, userId);
  if (!current) return jsonResponse({ ok: false, code: "NOT_FOUND", message: "Team member not found." }, 404);
  if (current.accepted_at) return jsonResponse({ ok: false, code: "NOT_INVITED", message: "Only pending invited users can be resent an invite." }, 409);

  const userResp = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=email`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  const users = userResp.ok ? await userResp.json().catch(() => []) : [];
  const email = Array.isArray(users) ? users[0]?.email : null;
  if (!email) return jsonResponse({ ok: false, code: "EMAIL_NOT_FOUND", message: "Unable to find this member email." }, 404);

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? supabaseUrl ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseServiceRoleKey ?? "", {
    auth: { persistSession: false },
  });
  const redirectTo = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000") + "/auth/callback";
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { company_id: companyId, role: current.role },
    redirectTo,
  } as any);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.log("[company-members] resend invite failed", { message: error.message });
    return jsonResponse({ ok: false, code: "RESEND_FAILED", message: "Unable to resend invite. Try again." }, 500);
  }

  const userLabel = await getUserLabel(userId);
  await createNotificationsSafely([
    {
      companyId,
      audience: "company_admins",
      type: "invite_resent",
      category: "team",
      severity: "info",
      title: "Invitation resent",
      message: `Invitation was resent to ${userLabel}.`,
      data: { href: "/dashboard/settings" },
    },
    {
      companyId,
      userId,
      audience: "user",
      type: "workspace_invite_resent",
      category: "team",
      severity: "info",
      title: "Workspace invitation resent",
      message: "Your workspace invitation was resent.",
      data: { href: "/dashboard" },
    },
  ], "company-members-resend");

  return jsonResponse({ ok: true, message: "Invite resent." }, 200);
}

export const runtime = "edge";
