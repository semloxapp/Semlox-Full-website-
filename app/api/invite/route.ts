import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase";
import { extractBearerTokenFromRequest, getUserFromAccessToken, getMembershipsByUserId } from "@/lib/auth";
import { createNotificationsSafely, getCompanyName } from "@/lib/notifications";
import { createClient } from "@supabase/supabase-js";

function randomPassword(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const serviceHeaders = () => ({
  apikey: supabaseServiceRoleKey as string,
  Authorization: `Bearer ${supabaseServiceRoleKey}`,
  "Content-Type": "application/json",
});

const inviteRoles = new Set(["admin", "manager", "operator", "viewer"]);

function getRedirectTo() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000") + "/auth/callback";
}

function createSupabaseAuthClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? supabaseUrl ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseServiceRoleKey ?? "", {
    auth: { persistSession: false },
  });
}

function isAlreadyRegisteredError(error: any) {
  const message = String(error?.message || error?.msg || error?.error_description || "").toLowerCase();
  return message.includes("already") && (message.includes("registered") || message.includes("exists"));
}

async function findAuthUserByEmail(email: string) {
  const targetEmail = email.trim().toLowerCase();
  const supabaseAuth = createSupabaseAuthClient();

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAuth.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;

    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((user: any) => String(user?.email || "").trim().toLowerCase() === targetEmail);
    if (match) return { id: match.id, email: match.email };

    const lastPage = Number((data as any)?.lastPage || 0);
    if (!lastPage || page >= lastPage || users.length === 0) break;
  }

  return null;
}

async function getCompanyMembership(companyId: string, userId: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&user_id=eq.${userId}`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  if (!resp.ok) return null;
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function ensureProfile(userId: string, fullName: string) {
  const existing = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id`, {
    method: "GET",
    headers: serviceHeaders(),
  });
  const rows = existing.ok ? await existing.json().catch(() => []) : [];
  const hasProfile = Array.isArray(rows) && rows.length > 0;
  const method = hasProfile ? "PATCH" : "POST";
  const url = hasProfile ? `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}` : `${supabaseUrl}/rest/v1/profiles`;

  const resp = await fetch(url, {
    method,
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(hasProfile ? { full_name: fullName } : { id: userId, full_name: fullName }),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

async function sendPasswordSetupEmail(email: string) {
  const supabaseAuth = createSupabaseAuthClient();
  return await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo: getRedirectTo() });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Parse body first
  const { fullName, email, role = "operator", tempPassword, companyId: bodyCompanyId, sendInvite = true } = await request.json().catch(() => ({}));

  if (process.env.NODE_ENV !== "production") console.log("[invite-api] request received");

  if (!email) {
    return new Response(JSON.stringify({ ok: false, code: "MISSING_EMAIL", message: "Please enter an email address." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (!fullName) {
    return new Response(JSON.stringify({ ok: false, code: "MISSING_FIELDS", message: "Please fill all required fields." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRole = String(role || "operator").toLowerCase();
  if (!inviteRoles.has(normalizedRole)) {
    return jsonResponse({ ok: false, code: "INVALID_ROLE", message: "Please select a valid member role." }, 400);
  }

  // Authenticate: accept Bearer header or semlox_session cookie via helper
  const token = extractBearerTokenFromRequest(request);
  const headerPresent = Boolean(request.headers.get("authorization") || request.headers.get("Authorization"));
  const cookiePresent = Boolean((request.headers.get("cookie") || "").includes("semlox_session="));
  if (process.env.NODE_ENV !== "production") console.log("[invite-api] auth method", { headerPresent, cookiePresent });

  if (!token) {
    return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // Validate caller is admin/owner of the company
  let callerId: string | null = null;
  let companyId: string | null = null;
  let password: string | undefined = undefined;
  try {
    if (process.env.NODE_ENV !== "production") console.log("[invite-api] validating token and fetching user");
    const user = await getUserFromAccessToken(token);
    if (!user || !user.id) {
      return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    callerId = user.id;

    // Determine companyId: prefer bodyCompanyId if provided, otherwise derive from caller's owner/admin memberships when exactly one exists
    companyId = bodyCompanyId || null;
    if (!companyId) {
      const memberships = await getMembershipsByUserId(callerId);
      const allowed = (memberships || []).filter((m: any) => {
        const roleStr = (m.role || "").toLowerCase();
        return roleStr === "owner" || roleStr === "admin";
      });
      if (allowed.length === 1) {
        companyId = allowed[0].company_id;
        if (process.env.NODE_ENV !== "production") console.log("[invite-api] derived companyId", { companyId });
      }
    }

    if (!companyId) {
      return new Response(JSON.stringify({ ok: false, code: "MISSING_FIELDS", message: "Please include companyId or ensure you are owner/admin of exactly one company." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Check memberships for owner/admin on the target company
    const memberResp = await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${companyId}&user_id=eq.${callerId}&role=in.(owner,admin)`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    });
    const memberData = await memberResp.json().catch(() => []);
    if (!memberResp.ok || !Array.isArray(memberData) || memberData.length === 0) {
      if (process.env.NODE_ENV !== "production") console.log("[invite-api] caller membership check failed", { callerId, membershipQueryResult: memberData });
      return new Response(JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Only owners and admins can invite users." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    if (process.env.NODE_ENV !== "production") console.log("[invite-api] caller validated", { callerId, callerRole: memberData[0]?.role, companyId });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[invite-api] auth validation failed", e);
    return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!companyId) {
    return jsonResponse({ ok: false, code: "MISSING_FIELDS", message: "Please include companyId or ensure you are owner/admin of exactly one company." }, 400);
  }
  const targetCompanyId = companyId;

  let userId: string | null = null;
  let existingAuthUser = false;
  let successMessage = sendInvite ? "Invitation sent. The user must open the email and set their password before signing in." : "Invitation sent successfully.";

  const existingUser = await findAuthUserByEmail(normalizedEmail);
  if (existingUser?.id) {
    const existingUserId = String(existingUser.id);
    userId = existingUserId;
    existingAuthUser = true;

    const existingMembership = await getCompanyMembership(targetCompanyId, existingUserId);
    if (existingMembership) {
      return jsonResponse({ ok: false, code: "ALREADY_MEMBER", message: "This user is already a member of this company." }, 409);
    }

    successMessage = "User already exists. Company access has been re-added and a password setup email has been sent.";
  } else if (sendInvite) {
    // For new users, use Supabase Admin invite so Supabase sends email via configured SMTP.
    try {
      if (process.env.NODE_ENV !== "production") console.log("[invite-api] calling supabase.auth.admin.inviteUserByEmail");

      const supabaseAdmin = createSupabaseAuthClient();

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: { full_name: fullName, company_id: targetCompanyId, role: normalizedRole },
        redirectTo: getRedirectTo(),
      } as any);

      if (inviteError) {
        if (isAlreadyRegisteredError(inviteError)) {
          const registeredUser = await findAuthUserByEmail(normalizedEmail);
          const registeredUserId = registeredUser?.id ? String(registeredUser.id) : null;
          if (registeredUserId) {
            const existingMembership = await getCompanyMembership(targetCompanyId, registeredUserId);
            if (existingMembership) {
              return jsonResponse({ ok: false, code: "ALREADY_MEMBER", message: "This user is already a member of this company." }, 409);
            }
            userId = registeredUserId;
            existingAuthUser = true;
            successMessage = "User already exists. Company access has been re-added and a password setup email has been sent.";
          } else {
            return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Invitation could not be sent. Please try again." }, 500);
          }
        } else {
        if (process.env.NODE_ENV !== "production") console.log("[invite-api] invite error", { message: inviteError.message });
        return jsonResponse({ ok: false, code: "INVITE_EMAIL_FAILED", message: "Invitation could not be sent. Please check email settings." }, 500);
        }
      }

      const inviteResult = inviteData as { user?: { id?: string }; id?: string } | null;
      if (process.env.NODE_ENV !== "production") console.log("[invite-api] invite success", { invitedUserId: !!(inviteResult?.user?.id || inviteResult?.id) });

      userId = userId ?? inviteResult?.user?.id ?? inviteResult?.id ?? null;
    } catch (err: any) {
      if (isAlreadyRegisteredError(err)) {
        const registeredUser = await findAuthUserByEmail(normalizedEmail);
        const registeredUserId = registeredUser?.id ? String(registeredUser.id) : null;
        if (registeredUserId) {
          const existingMembership = await getCompanyMembership(targetCompanyId, registeredUserId);
          if (existingMembership) {
            return jsonResponse({ ok: false, code: "ALREADY_MEMBER", message: "This user is already a member of this company." }, 409);
          }
          userId = registeredUserId;
          existingAuthUser = true;
          successMessage = "User already exists. Company access has been re-added and a password setup email has been sent.";
        } else {
          return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Invitation could not be sent. Please try again." }, 500);
        }
      } else {
      if (process.env.NODE_ENV !== "production") console.log("[invite-api] invite unexpected error", { message: String(err?.message ?? err) });
      return jsonResponse({ ok: false, code: "INVITE_EMAIL_FAILED", message: "Invitation could not be sent. Please check email settings." }, 500);
      }
    }
    if (!userId) {
      // If invite endpoint didn't return an id, attempt to look up the user by email (service role).
      const lookupUser = await findAuthUserByEmail(normalizedEmail);
      userId = lookupUser?.id ?? null;
    }
    if (!userId) {
      if (process.env.NODE_ENV !== "production") console.log("[invite] failed to determine invited user id after invite and lookup");
      return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Invitation could not be sent. Please check email settings." }, 500);
    }
  } else {
    // Direct creation with password is only allowed in non-production for safety.
    if (process.env.NODE_ENV === "production") {
      return jsonResponse({ ok: false, code: "DIRECT_CREATE_DISABLED", message: "Direct create is disabled in production. Use sendInvite=true." }, 403);
    }
    password = tempPassword || randomPassword();
    const authResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password, email_confirm: true, user_metadata: { full_name: fullName } }),
    });
    const authData = await authResp.json();
    if (!authResp.ok) {
      const message = authData?.msg || authData?.message || authData?.error_description || "Failed to create user";
      return jsonResponse({ ok: false, code: "INVITE_FAILED", message: String(message) }, authResp.status);
    }
    userId = authData?.id ?? authData?.user?.id ?? null;
    if (!userId) return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Failed to extract user id" }, 500);
  }

  if (!userId) {
    return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Failed to extract user id" }, 500);
  }
  const targetUserId = userId;

  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  try {
    const profileResult = await ensureProfile(targetUserId, fullName);
    if (!profileResult.ok) {
      const profileData = profileResult.data;
      const message = profileData?.message || profileData?.detail || "Failed to create profile";
      if (process.env.NODE_ENV !== "production") console.log("[invite] create profile failed", { userId: targetUserId, message });
      return jsonResponse({ ok: false, code: "PROFILE_CREATE_FAILED", message: String(message) }, profileResult.status);
    }

    // Create company access only. Existing auth users are re-added as invited.
    const membershipBody: any = { company_id: targetCompanyId, user_id: targetUserId, role: normalizedRole };
    membershipBody.invited_by = callerId || null;
    membershipBody.invited_at = new Date().toISOString();
    membershipBody.accepted_at = sendInvite || existingAuthUser ? null : new Date().toISOString();

    const membershipResp = await fetch(`${supabaseUrl}/rest/v1/memberships`, {
      method: "POST",
      headers,
      body: JSON.stringify(membershipBody),
    });
    const membershipData = await membershipResp.json();
    if (!membershipResp.ok) {
      const message = membershipData?.message || membershipData?.detail || "Failed to create membership";
      if (process.env.NODE_ENV !== "production") console.log("[invite] create membership failed", { userId: targetUserId, companyId: targetCompanyId, message });
      // If user already member, return a friendly message
      const m = String(message).toLowerCase();
      if (m.includes("already") || m.includes("duplicate")) {
        return jsonResponse({ ok: false, code: "ALREADY_MEMBER", message: "This user is already a member of this company." }, membershipResp.status);
      }
      return jsonResponse({ ok: false, code: "MEMBERSHIP_CREATE_FAILED", message: String(message) }, membershipResp.status);
    }

    const membershipResult = Array.isArray(membershipData) ? membershipData[0] : membershipData;
    if (existingAuthUser) {
      const { error: recoveryError } = await sendPasswordSetupEmail(normalizedEmail);
      if (recoveryError) {
        await fetch(`${supabaseUrl}/rest/v1/memberships?company_id=eq.${targetCompanyId}&user_id=eq.${targetUserId}`, {
          method: "DELETE",
          headers: serviceHeaders(),
        }).catch(() => {});
        if (process.env.NODE_ENV !== "production") console.log("[invite] password setup email failed", { message: recoveryError.message });
        return jsonResponse({ ok: false, code: "PASSWORD_SETUP_EMAIL_FAILED", message: "Company access could not be re-added because the password setup email could not be sent. Please check email settings." }, 500);
      }
    }

    const companyName = (await getCompanyName(targetCompanyId)) || "the workspace";
    const memberLabel = String(fullName || normalizedEmail).trim().slice(0, 160);
    await createNotificationsSafely([
        {
          companyId: targetCompanyId,
          audience: "company_admins",
          type: existingAuthUser ? "member_readded" : "member_invited",
          category: "team",
          severity: "info",
          title: existingAuthUser ? "Member re-added" : "Team member invited",
          message: `${memberLabel} was ${existingAuthUser ? "re-added to" : "invited to"} the workspace.`,
          data: { href: "/dashboard/settings" },
        },
        {
          companyId: targetCompanyId,
          userId: targetUserId,
          audience: "user",
          type: existingAuthUser ? "workspace_access_added" : "workspace_invite",
          category: "team",
          severity: "info",
          title: existingAuthUser ? "Workspace access added" : "You were invited to a workspace",
          message: existingAuthUser
            ? `Your access to ${companyName} has been added again.`
            : `You were invited to join ${companyName}.`,
          data: { href: "/dashboard" },
        },
      ], "invite");

    if (process.env.NODE_ENV !== "production") console.log("[invite] success", { inviter: callerId, userId: targetUserId, companyId: targetCompanyId, role: membershipResult.role, sendInvite, existingAuthUser });
    const responsePayload: any = {
      ok: true,
      message: successMessage,
      userId: targetUserId,
      membership: membershipResult,
    };
    if (process.env.NODE_ENV !== "production" && !sendInvite) {
      responsePayload.plainPassword = tempPassword || password;
    }
    return jsonResponse(responsePayload, 200);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.log("[invite] unexpected error", e);
    return jsonResponse({ ok: false, code: "INVITE_FAILED", message: "Invitation could not be sent. Please check email settings." }, 500);
  }
}

export const runtime = "edge";
