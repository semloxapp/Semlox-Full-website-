import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlatformAdminIdentity } from "./auth-types";

export type { PlatformAdminIdentity } from "./auth-types";

function getPlatformAdminEmails() {
  return new Set(
    (process.env.SEMLOX_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSemloxPlatformAdmin(email?: string | null) {
  if (!email) return false;
  // Temporary Phase 1 platform-admin authorization.
  // Replace with a dedicated server-side platform admin model during the backend phase.
  return getPlatformAdminEmails().has(email.trim().toLowerCase());
}

export async function getPlatformAdminAccess(): Promise<{
  authenticated: boolean;
  authorized: boolean;
  admin: PlatformAdminIdentity | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authenticated: false, authorized: false, admin: null };
  if (!user.email || !isSemloxPlatformAdmin(user.email)) {
    return { authenticated: true, authorized: false, admin: null };
  }

  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return {
    authenticated: true,
    authorized: true,
    admin: {
      email: user.email,
      name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : "SemloX Admin",
    },
  };
}
