import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/server/auth";
import { getAdminFieldIntelligence } from "@/lib/admin/server/field-intelligence-service";
import { parseAdminFieldIntelligenceQuery } from "@/lib/admin/server/validation";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, code: guard.code, message: guard.status === 401 ? "Authentication is required." : "You are not authorized to access this resource." }, { status: guard.status, headers: privateHeaders });
  const parsed = parseAdminFieldIntelligenceQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: parsed.code, message: parsed.message }, { status: 400, headers: privateHeaders });
  try {
    const data = await getAdminFieldIntelligence(parsed.value);
    console.info("[admin-analytics] field intelligence", { searchPresent: Boolean(parsed.value.search), status: parsed.value.status, groups: data.items.length, rows: data.summary.totalFieldRows, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, data }, { headers: privateHeaders });
  } catch {
    console.error("[admin-analytics] field intelligence failed", { code: "FIELD_INTELLIGENCE_QUERY_FAILED", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: false, code: "FIELD_INTELLIGENCE_QUERY_FAILED", message: "Field intelligence data could not be loaded." }, { status: 500, headers: privateHeaders });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
