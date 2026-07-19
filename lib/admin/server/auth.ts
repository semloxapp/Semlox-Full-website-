import "server-only";

import { getPlatformAdminAccess } from "@/lib/admin/auth";
import { resolvePlatformAdminGuard, type PlatformAdminGuard } from "@/lib/admin/authorization";

export type { PlatformAdminGuard } from "@/lib/admin/authorization";

export async function requirePlatformAdmin(): Promise<PlatformAdminGuard> {
  return resolvePlatformAdminGuard(await getPlatformAdminAccess());
}
