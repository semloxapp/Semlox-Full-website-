import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getPlatformAdminAccess } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/layout/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const access = await getPlatformAdminAccess();
  if (!access.authenticated) redirect("/admin/login");
  if (!access.authorized || !access.admin) redirect("/admin/unauthorized");

  return <AdminShell admin={access.admin}>{children}</AdminShell>;
}
