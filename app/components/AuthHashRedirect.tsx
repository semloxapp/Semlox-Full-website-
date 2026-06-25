"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const { hash, pathname, search } = window.location;
      if (!hash) return;
      if (hash.includes("access_token=") || hash.includes("refresh_token=")) {
        // Move hash to /auth/callback so the callback handler can process and then
        // immediately remove the hash from the visible URL. Do not log tokens.
        const target = "/auth/callback" + hash;
        // Use replace to avoid creating history entries exposing tokens.
        router.replace(target);
      }
    } catch (e) {
      // ignore
    }
  }, [router]);

  return null;
}
