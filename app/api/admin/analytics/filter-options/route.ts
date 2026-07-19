import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/server/auth";
import { getAdminAnalyticsFilterOptions } from "@/lib/admin/server/repository";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return NextResponse.json(
    { ok: false, code: guard.code, message: guard.status === 401 ? "Authentication is required." : "You are not authorized to access this resource." },
    { status: guard.status, headers: privateHeaders },
  );
  try {
    return NextResponse.json({ ok: true, data: await getAdminAnalyticsFilterOptions() }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ ok: false, code: "FILTER_OPTIONS_QUERY_FAILED", message: "Analytics filter options could not be loaded." }, { status: 500, headers: privateHeaders });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
