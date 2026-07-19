import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/server/auth";
import { getAdminOverviewAnalytics } from "@/lib/admin/server/analytics-service";
import { parseAdminAnalyticsScope } from "@/lib/admin/server/validation";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const guard = await requirePlatformAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, code: guard.code, message: guard.status === 401 ? "Authentication is required." : "Platform administrator access is required." },
      { status: guard.status, headers: privateHeaders }
    );
  }
  const scope = parseAdminAnalyticsScope(request.nextUrl.searchParams);
  if (!scope.ok) return NextResponse.json({ ok: false, code: scope.code, message: scope.message }, { status: 400, headers: privateHeaders });

  try {
    const data = await getAdminOverviewAnalytics(scope.value);
    console.info("[admin-analytics] overview", { documents: data.metrics[0]?.value ?? "0", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, data }, { status: 200, headers: privateHeaders });
  } catch {
    console.error("[admin-analytics] overview failed", { durationMs: Date.now() - startedAt, code: "OVERVIEW_QUERY_FAILED" });
    return NextResponse.json(
      { ok: false, code: "OVERVIEW_QUERY_FAILED", message: "Analytics data could not be loaded." },
      { status: 500, headers: privateHeaders }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
