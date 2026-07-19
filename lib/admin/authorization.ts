import type { PlatformAdminIdentity } from "./auth-types";

export type PlatformAdminAccessState = {
  authenticated: boolean;
  authorized: boolean;
  admin: PlatformAdminIdentity | null;
};

export type PlatformAdminGuard =
  | { ok: true; admin: PlatformAdminIdentity }
  | { ok: false; status: 401 | 403; code: "UNAUTHENTICATED" | "FORBIDDEN" };

export function resolvePlatformAdminGuard(access: PlatformAdminAccessState): PlatformAdminGuard {
  if (!access.authenticated) return { ok: false, status: 401, code: "UNAUTHENTICATED" };
  if (!access.authorized || !access.admin) return { ok: false, status: 403, code: "FORBIDDEN" };
  return { ok: true, admin: access.admin };
}
