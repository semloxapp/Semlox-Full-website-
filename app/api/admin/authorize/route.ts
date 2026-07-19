import { NextResponse } from "next/server";
import { getPlatformAdminAccess } from "@/lib/admin/auth";

export async function GET() {
  const state = await getPlatformAdminAccess();
  if (!state.authenticated) {
    return NextResponse.json({ ok: false, authorized: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, authorized: state.authorized });
}

export const runtime = "nodejs";
