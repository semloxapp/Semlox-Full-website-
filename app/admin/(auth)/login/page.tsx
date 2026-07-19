"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const login = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const loginBody = await login.json().catch(() => ({}));
      if (!login.ok) {
        setError(loginBody.message || "Sign in failed.");
        return;
      }

      const authorization = await fetch("/api/admin/authorize", { credentials: "include" });
      if (authorization.status === 401) {
        setError("Your secure session could not be verified.");
        return;
      }
      const authorizationBody = await authorization.json().catch(() => ({}));
      router.replace(authorizationBody.authorized ? "/admin" : "/admin/unauthorized");
      router.refresh();
    } catch {
      setError("The admin portal is temporarily unavailable. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-mark">S</div>
        <div className="admin-secure-badge"><ShieldCheck size={13} /> Secure internal access</div>
        <h1 id="admin-login-title">SemloX Platform Admin</h1>
        <p>Internal AI Intelligence Portal</p>
        <form onSubmit={submit} className="admin-login-form">
          <label htmlFor="admin-email">Admin email</label>
          <input id="admin-email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
          {error ? <div className="admin-form-error" role="alert">{error}</div> : null}
          <button type="submit" className="admin-button admin-button-primary" disabled={loading}>
            <LockKeyhole size={14} /> {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin-login-note">Authorized SemloX personnel only.</p>
        <Link href="/login" className="admin-text-link">Return to customer login</Link>
      </section>
    </main>
  );
}
