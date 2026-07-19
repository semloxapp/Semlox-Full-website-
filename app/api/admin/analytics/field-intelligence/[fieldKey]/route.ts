import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/server/auth";
import { getAdminFieldIntelligenceDetail } from "@/lib/admin/server/field-intelligence-service";
import { validateAdminFieldKey } from "@/lib/admin/server/validation";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: Request, { params }: { params: Promise<{ fieldKey: string }> }) {
  const startedAt = Date.now();
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return NextResponse.json({ ok: false, code: guard.code, message: guard.status === 401 ? "Authentication is required." : "You are not authorized to access this resource." }, { status: guard.status, headers: privateHeaders });
  const parsed = validateAdminFieldKey((await params).fieldKey);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: parsed.code, message: parsed.message }, { status: 400, headers: privateHeaders });
  try {
    const data = await getAdminFieldIntelligenceDetail(parsed.value);
    if (!data) return NextResponse.json({ ok: false, code: "FIELD_NOT_FOUND", message: "Field analytics were not found." }, { status: 404, headers: privateHeaders });
    console.info("[admin-analytics] field intelligence detail", { fieldKey: parsed.value, occurrences: data.metrics.occurrenceCount, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, data }, { headers: privateHeaders });
  } catch {
    console.error("[admin-analytics] field intelligence detail failed", { code: "FIELD_DETAIL_QUERY_FAILED", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: false, code: "FIELD_DETAIL_QUERY_FAILED", message: "Field details could not be loaded." }, { status: 500, headers: privateHeaders });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
