"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

async function resolveMembershipsAndRedirect(router: ReturnType<typeof useRouter>) {
  const mResp = await fetch("/api/auth/memberships", { credentials: "include" });
  if (!mResp.ok) {
    router.replace("/login");
    return;
  }
  const j = await mResp.json().catch(() => ({}));
  if (j?.ok === false) {
    router.replace("/login");
    return;
  }
  const memberships = j?.memberships || [];

  const hasAccepted = Array.isArray(memberships) && memberships.some((m: any) => !!m.accepted_at);
  if (hasAccepted) {
    router.replace("/dashboard");
    return;
  }

  const pending = Array.isArray(memberships) ? memberships.filter((m: any) => !m.accepted_at) : [];
  if (pending.length === 1) {
    const acceptResp = await fetch("/api/auth/accept-invite", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: pending[0].company_id }),
    });
    const a = await acceptResp.json().catch(() => ({}));
    if (acceptResp.ok && a?.ok !== false) {
      router.replace("/dashboard");
      return;
    }
  }

  router.replace("/login");
}

type CallbackStage = "processing" | "set-password" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [stage, setStage] = useState<CallbackStage>("processing");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { hash, search } = window.location;

        // Legacy implicit/hash flow: #access_token=...&refresh_token=...&type=...
        // Prefer configuring Supabase Auth email templates to use the PKCE
        // (?code=) flow so this branch stops being reachable.
        if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const flowType = params.get("type");

          const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
          window.history.replaceState(null, "", cleanUrl);

          if (!accessToken || !refreshToken) {
            router.replace("/login");
            return;
          }

          // Establishes the same httpOnly cookie session /login and
          // /exchange use — no token is ever kept in JS-reachable storage.
          const setResp = await fetch("/api/auth/set-session", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
          });
          if (!setResp.ok) {
            router.replace("/login");
            return;
          }

          if (flowType === "invite" || flowType === "recovery") {
            setStage("set-password");
            return;
          }

          await resolveMembershipsAndRedirect(router);
          return;
        }

        // PKCE/code flow: ?code=...
        if (search && search.includes("code=")) {
          const u = new URL(window.location.href);
          const code = u.searchParams.get("code");
          const flowType = u.searchParams.get("type");
          u.searchParams.delete("code");
          u.searchParams.delete("state");
          u.searchParams.delete("type");
          window.history.replaceState(null, "", u.toString());

          if (!code) {
            router.replace("/login");
            return;
          }

          const exch = await fetch("/api/auth/exchange", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });
          if (!exch.ok) {
            router.replace("/login");
            return;
          }
          const payload = await exch.json().catch(() => ({}));
          if (payload?.ok === false) {
            router.replace("/login");
            return;
          }

          if (flowType === "invite" || flowType === "recovery") {
            setStage("set-password");
            return;
          }

          await resolveMembershipsAndRedirect(router);
          return;
        }

        router.replace("/login");
      } catch (err) {
        setStage("error");
      }
    })();
  }, [router]);

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!password || password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      // Uses the cookie session already established above — no access
      // token is ever read into browser JS for this step.
      const resp = await fetch("/api/auth/set-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await resp.json().catch(() => ({}));

      if (!resp.ok || body?.ok === false) {
        setPasswordError(body?.message || "Password could not be set. Please request a new invitation email.");
        return;
      }

      // Password is set and the person already has an active session from
      // the invite/recovery link, so accept any single pending invite and
      // send them straight into the dashboard rather than back to /login.
      await resolveMembershipsAndRedirect(router);
    } catch (e) {
      setPasswordError("Password could not be set. Please request a new invitation email.");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (stage === "set-password") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070B17] px-6 text-white">
        <form onSubmit={submitPassword} className="w-full max-w-[360px] rounded-[14px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <h1 className="text-[18px] font-extrabold text-white">Set Password</h1>
          <p className="mt-1 text-[12px] text-slate-400">Create your password from the invitation email.</p>

          <label className="mt-4 block">
            <span className="text-[11px] font-bold text-slate-400">New Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[12px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
              autoComplete="new-password"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-[11px] font-bold text-slate-400">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[7px] border border-white/[0.12] bg-white/[0.045] px-3 text-[12px] font-semibold text-white outline-none placeholder:text-[#64748B] focus:border-[#2F80FF]"
              autoComplete="new-password"
            />
          </label>

          {passwordError && <p className="mt-3 text-[11px] font-semibold text-red-300">{passwordError}</p>}
          {passwordMessage && <p className="mt-3 text-[11px] font-semibold text-cyan-200">{passwordMessage}</p>}

          <button
            type="submit"
            disabled={passwordLoading}
            className="mt-4 flex h-9 w-full items-center justify-center rounded-[7px] bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] text-[12px] font-bold text-white disabled:opacity-70"
          >
            {passwordLoading ? "Setting password..." : "Set Password"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070B17]">
      <div className="text-center text-white">
        <div className="mb-4">Processing authentication...</div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20" />
      </div>
    </main>
  );
}
