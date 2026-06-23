"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/auth/signout", { method: "POST" });
      } catch (e) {}
      localStorage.removeItem("semlox_access_token");
      sessionStorage.removeItem("semlox_access_token");
      try {
        localStorage.removeItem("last_company_id");
        sessionStorage.removeItem("last_company_id");
      } catch (e) {}
      router.replace("/login");
    })();
  }, [router]);

  return null;
}
