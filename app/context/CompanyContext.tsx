"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CompanyContextType = {
  selectedCompanyId: string | null;
  isHydrated: boolean;
  setSelectedCompanyId: (id: string | null, persist?: boolean) => void;
};

type Membership = {
  company_id: string;
  accepted_at?: string | null;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasAttemptedInviteAcceptanceRef = React.useRef(false);

  const setSelectedCompanyId = useCallback((id: string | null, persist = true) => {
    setSelectedCompanyIdState((current) => (current === id ? current : id));
    if (typeof window === "undefined") return;
    try {
      if (persist) {
        if (id) {
          localStorage.setItem("last_company_id", id);
          sessionStorage.setItem("last_company_id", id);
        } else {
          localStorage.removeItem("last_company_id");
          sessionStorage.removeItem("last_company_id");
        }
      }
    } catch {
      // Ignore storage errors; the in-memory selection remains valid.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("last_company_id") || localStorage.getItem("last_company_id");
    } catch {
      // Ignore storage errors.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      if (stored) setSelectedCompanyIdState((current) => current || stored);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // If the user arrived via a Supabase invite link and a session exists,
  // accept a single pending membership automatically (server-side verification).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasAttemptedInviteAcceptanceRef.current) return;

    // Attempt invite acceptance using server-side cookie session; do NOT rely on
    // client-stored tokens. Always call memberships endpoint without
    // Authorization header so the server-side cookie is primary.

    // Mark we attempted to avoid duplicate calls on re-renders
    hasAttemptedInviteAcceptanceRef.current = true;

    (async () => {
      try {
        if (process.env.NODE_ENV !== "production") console.log("[auth] checking memberships for invite acceptance");

        const mResp = await fetch("/api/auth/memberships", { credentials: "include" });
        // If not authenticated (no cookie/session), memberships returns 401 — treat as not logged in and do nothing.
        if (mResp.status === 401) return;
        if (!mResp.ok) {
          if (process.env.NODE_ENV !== "production") console.log("[auth] memberships fetch failed", mResp.status);
          return;
        }
        const j = await mResp.json().catch(() => ({}));
        if (j?.ok === false) {
          if (process.env.NODE_ENV !== "production") console.log("[auth] memberships payload error", j);
          return;
        }
        const memberships = j?.memberships || [];
        if (process.env.NODE_ENV !== "production") console.log("[auth] memberships count", memberships.length);

        const pending = (memberships as Membership[]).filter((membership) => !membership.accepted_at);
        if (!Array.isArray(pending) || pending.length === 0) return;

        // If exactly one pending membership, auto-accept it for convenience.
        if (pending.length === 1) {
          const companyId = pending[0].company_id;
          if (process.env.NODE_ENV !== "production") console.log("[auth] auto-accepting invite for company", companyId);

          const acceptHeaders: Record<string, string> = { "Content-Type": "application/json" };
          const acceptResp = await fetch("/api/auth/accept-invite", {
            method: "POST",
            credentials: "include",
            headers: acceptHeaders,
            body: JSON.stringify({ companyId }),
          });

          const aBody = await acceptResp.json().catch(() => ({}));
          if (!acceptResp.ok || aBody?.ok === false) {
            if (process.env.NODE_ENV !== "production") console.log("[auth] accept-invite failed", aBody || (await acceptResp.text().catch(() => "")));
            return;
          }

          // on success, persist selected company and return
          setSelectedCompanyId(companyId, true);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.log("[auth] invite acceptance error", e);
      }
    })();
  }, [setSelectedCompanyId]);

  const contextValue = useMemo(
    () => ({ selectedCompanyId, isHydrated, setSelectedCompanyId }),
    [isHydrated, selectedCompanyId, setSelectedCompanyId]
  );

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
