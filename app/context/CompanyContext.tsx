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

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

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
