"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { hash, search } = window.location;

        // If the legacy implicit flow returned tokens in the hash (#access_token=...)
        if (hash && (hash.includes("access_token=") || hash.includes("refresh_token="))) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const flowType = params.get("type");

          // Supabase invite/recovery links establish a temporary session that can
          // set a password. Keep the token in memory only after cleaning the URL.
          if (accessToken && (flowType === "invite" || flowType === "recovery")) {
            const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
            window.history.replaceState(null, "", cleanUrl);
            setPasswordSetupToken(accessToken);
            return;
          }

          if (accessToken) {
            // Store only the access token in session storage (do not log it).
            try {
              sessionStorage.setItem("semlox_access_token", accessToken);
            } catch (e) {
              // ignore storage errors
            }
          }

          // Immediately remove the hash from the URL to avoid leaking tokens.
          const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
          window.history.replaceState(null, "", cleanUrl);

          // Decide where to redirect: check memberships server-side using existing API.
          try {
            const token = accessToken;
            if (!token) {
              router.replace("/login");
              return;
            }

            const mResp = await fetch("/api/auth/memberships", { headers: { Authorization: `Bearer ${token}` } });
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

            // If any accepted membership exists, go to dashboard
            const hasAccepted = Array.isArray(memberships) && memberships.some((m: any) => !!m.accepted_at);
            if (hasAccepted) {
              router.replace("/dashboard");
              return;
            }

            // If there is exactly one pending invite, attempt to accept it server-side
            const pending = Array.isArray(memberships) ? memberships.filter((m: any) => !m.accepted_at) : [];
            if (pending.length === 1) {
              const acceptResp = await fetch("/api/auth/accept-invite", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ companyId: pending[0].company_id }),
              });
              const a = await acceptResp.json().catch(() => ({}));
              if (acceptResp.ok && a?.ok !== false) {
                router.replace("/dashboard");
                return;
              }
            }

            // Default: go to login so user can complete company selection.
            router.replace("/login");
            return;
          } catch (e) {
            router.replace("/login");
            return;
          }
        }

        // If PKCE/code flow used and we have ?code= in query, exchange it server-side
        if (search && search.includes("code=")) {
          const u = new URL(window.location.href);
          const code = u.searchParams.get("code");
          const flowType = u.searchParams.get("type");
          // Clear query params immediately from URL
          u.searchParams.delete("code");
          u.searchParams.delete("state");
          u.searchParams.delete("type");
          window.history.replaceState(null, "", u.toString());

          if (!code) {
            router.replace("/login");
            return;
          }

          try {
            const exch = await fetch("/api/auth/exchange", {
              method: "POST",
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
            const accessToken = payload?.access_token ?? payload?.session?.access_token ?? payload?.session?.accessToken ?? null;
            if (!accessToken) {
              router.replace("/login");
              return;
            }

            if (flowType === "invite" || flowType === "recovery") {
              setPasswordSetupToken(accessToken);
              return;
            }

            try {
              // set sessionStorage as a temporary client-side fallback; server cookie is primary
              sessionStorage.setItem("semlox_access_token", accessToken);
            } catch (e) {}

            // After session set, reuse same membership resolution logic as hash flow
            const mResp = await fetch("/api/auth/memberships", { headers: { Authorization: `Bearer ${accessToken}` } });
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
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ companyId: pending[0].company_id }),
              });
              const a = await acceptResp.json().catch(() => ({}));
              if (acceptResp.ok && a?.ok !== false) {
                router.replace("/dashboard");
                return;
              }
            }

            router.replace("/login");
            return;
          } catch (e) {
            router.replace("/login");
            return;
          }
        }

        // No tokens or code present - go to login.
        router.replace("/login");
      } catch (err) {
        try {
          router.replace("/login");
        } catch (e) {}
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

    if (!passwordSetupToken || !supabaseUrl || !supabaseAnonKey) {
      setPasswordError("Password setup is unavailable. Please request a new invitation email.");
      return;
    }

    setPasswordLoading(true);
    try {
      const updateResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${passwordSetupToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const updateBody = await updateResp.json().catch(() => ({}));
      if (!updateResp.ok) {
        setPasswordError(updateBody?.message || updateBody?.msg || "Password could not be set. Please request a new invitation email.");
        return;
      }

      try {
        const mResp = await fetch("/api/auth/memberships", { headers: { Authorization: `Bearer ${passwordSetupToken}` } });
        if (mResp.ok) {
          const j = await mResp.json().catch(() => ({}));
          const memberships = j?.memberships || [];
          const pending = Array.isArray(memberships) ? memberships.filter((m: any) => !m.accepted_at) : [];
          if (pending.length === 1) {
            await fetch("/api/auth/accept-invite", {
              method: "POST",
              headers: { Authorization: `Bearer ${passwordSetupToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ companyId: pending[0].company_id }),
            });
          }
        }
      } catch (e) {
        // Invite acceptance can be retried after login; password setup succeeded.
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password set successfully. You can now sign in.");
      window.setTimeout(() => router.replace("/login"), 1400);
    } catch (e) {
      setPasswordError("Password could not be set. Please request a new invitation email.");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (passwordSetupToken) {
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
