"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminUnauthorizedPage() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-mark">S</div>
        <h1>Access restricted</h1>
        <p>Your account is authenticated, but it is not authorized to access the SemloX internal admin portal.</p>
        <div className="admin-login-actions">
          <Link href="/dashboard" className="admin-button">Return to customer dashboard</Link>
          <button className="admin-button admin-button-primary" type="button" onClick={signOut}>Sign out</button>
        </div>
      </section>
    </main>
  );
}
