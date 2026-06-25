import { supabaseServiceRoleKey, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ ok: false, code: "AUTH_SERVICE_ERROR", message: "Service unavailable" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  const { fullName, companyName, email, password, phone } = await request.json().catch(() => ({}));

  if (!fullName || !companyName || !email || !password) {
    return new Response(JSON.stringify({ ok: false, code: "MISSING_FIELDS", message: "Please fill all required fields." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // 1) Create auth user via public signup so Supabase will send verification
  // emails through the configured SMTP (Brevo) when email confirmation is enabled.
  if (process.env.NODE_ENV !== "production") console.log("[signup] request received", { email, companyName });

  const signupResp = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName, company_name: companyName, phone },
    }),
  });

  const authData = await signupResp.json().catch(() => ({}));
  if (process.env.NODE_ENV !== "production") {
    console.log("[signup] signupResp.status", signupResp.status, "uses_public_signup", true);
  }

  if (!signupResp.ok) {
    const errorMessage = authData.msg || authData.message || authData.error_description || "Sign up failed";
    const normalizedMessage = String(errorMessage).toLowerCase();
    if (process.env.NODE_ENV !== "production") console.log("[signup] signup error", errorMessage);
    if (normalizedMessage.includes("already") || normalizedMessage.includes("registered") || normalizedMessage.includes("exists")) {
      return new Response(JSON.stringify({ ok: false, code: "EMAIL_ALREADY_REGISTERED", message: "An account with this email already exists. Please sign in." }), { status: signupResp.status, headers: { "Content-Type": "application/json" } });
    }
    // If Supabase reports email delivery problems, surface a friendly message
    if (/mail|smtp|send|delivery|confirmation/i.test(normalizedMessage)) {
      return new Response(JSON.stringify({ ok: false, code: "EMAIL_SEND_FAILED", message: "We could not send the confirmation email. Please try again or contact support." }), { status: signupResp.status, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, code: "SIGNUP_FAILED", message: String(errorMessage) }), { status: signupResp.status, headers: { "Content-Type": "application/json" } });
  }

  // Extract user id from signup response
  const userId = authData?.user?.id ?? authData?.id ?? null;
  const sessionPresent = !!(authData?.access_token || authData?.session);
  if (process.env.NODE_ENV !== "production") console.log("[signup] userCreated", { userId, sessionPresent });

  if (!userId) {
    if (process.env.NODE_ENV !== "production") console.log("[signup] no user id returned from signup");
    return new Response(JSON.stringify({ ok: false, code: "SIGNUP_FAILED", message: "Failed to create auth user" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Helper: delete created auth user (rollback)
  const deleteAuthUser = async (id: string) => {
    try {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseServiceRoleKey as string,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
      });
    } catch (e) {
      // swallow
    }
  };

  // 2) Create company, profile, membership via PostgREST (service role)
  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  let companyId: any = null;

  try {
    // Create company
    const compResp = await fetch(`${supabaseUrl}/rest/v1/companies`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: companyName, contact_email: email }),
    });

    const compData = await compResp.json().catch(() => ({}));
    if (!compResp.ok) {
      // If company name conflict or other error, rollback auth user
      await deleteAuthUser(userId);
      const message = compData?.message || compData?.detail || "Failed to create company";
      if (String(message).toLowerCase().includes("duplicate") || String(message).toLowerCase().includes("already")) {
        return new Response(JSON.stringify({ ok: false, code: "COMPANY_EXISTS", message: "A company with this name already exists." }), { status: compResp.status, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: false, code: "COMPANY_CREATE_FAILED", message }), { status: compResp.status, headers: { "Content-Type": "application/json" } });
    }

    companyId = Array.isArray(compData) ? compData[0]?.id : compData?.id;

    if (!companyId) {
      await deleteAuthUser(userId);
      return new Response(JSON.stringify({ ok: false, code: "COMPANY_CREATE_FAILED", message: "Failed to create company" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Create profile (profiles.id references auth.users.id)
    const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: userId, full_name: fullName, phone }),
    });

    const profileData = await profileResp.json().catch(() => ({}));
    if (!profileResp.ok) {
      // rollback: delete company and auth user
      await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companyId}`, { method: "DELETE", headers });
      await deleteAuthUser(userId);
      const message = profileData?.message || profileData?.detail || "Failed to create profile";
      return new Response(JSON.stringify({ ok: false, code: "PROFILE_CREATE_FAILED", message }), { status: profileResp.status, headers: { "Content-Type": "application/json" } });
    }

    // Create membership (make user owner). Set accepted_at so owner can use account immediately.
    const membershipBody: any = { company_id: companyId, user_id: userId, role: "owner", accepted_at: new Date().toISOString() };
    const membershipResp = await fetch(`${supabaseUrl}/rest/v1/memberships`, {
      method: "POST",
      headers,
      body: JSON.stringify(membershipBody),
    });

    const membershipData = await membershipResp.json().catch(() => ({}));
    if (!membershipResp.ok) {
      // rollback: delete profile, company, auth user
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: "DELETE", headers });
      await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companyId}`, { method: "DELETE", headers });
      await deleteAuthUser(userId);
      const message = membershipData?.message || membershipData?.detail || "Failed to create membership";
      return new Response(JSON.stringify({ ok: false, code: "MEMBERSHIP_CREATE_FAILED", message }), { status: membershipResp.status, headers: { "Content-Type": "application/json" } });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[signup] created company/profile/membership", { userId, companyId });
    }
    return new Response(JSON.stringify({ ok: true, userId, companyId }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    // on unexpected error, attempt rollback
    if (companyId) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companyId}`, { method: "DELETE", headers });
      } catch (e) {}
    }
    await deleteAuthUser(userId);
    if (process.env.NODE_ENV !== "production") console.log("[signup] unexpected error", err?.message || err);
    return new Response(JSON.stringify({ ok: false, code: "SIGNUP_FAILED", message: "Signup failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
