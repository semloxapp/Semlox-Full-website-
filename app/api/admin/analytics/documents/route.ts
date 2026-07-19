import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/server/auth";
import { getAdminDocuments } from "@/lib/admin/server/document-service";
import { parseAdminDocumentQuery } from "@/lib/admin/server/validation";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const guard = await requirePlatformAdmin();
  if (!guard.ok) return NextResponse.json(
    { ok: false, code: guard.code, message: guard.status === 401 ? "Authentication is required." : "You are not authorized to access this resource." },
    { status: guard.status, headers: privateHeaders },
  );
  const parsed = parseAdminDocumentQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return NextResponse.json({ ok: false, code: parsed.code, message: parsed.message }, { status: 400, headers: privateHeaders });
  try {
    const data = await getAdminDocuments(parsed.value);
    console.info("[admin-analytics] documents", { page: parsed.value.page, pageSize: parsed.value.pageSize, status: parsed.value.status, searchPresent: Boolean(parsed.value.search), returned: data.items.length, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, data }, { headers: privateHeaders });
  } catch {
    console.error("[admin-analytics] documents failed", { code: "DOCUMENT_LIST_QUERY_FAILED", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: false, code: "DOCUMENT_LIST_QUERY_FAILED", message: "Document data could not be loaded." }, { status: 500, headers: privateHeaders });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
