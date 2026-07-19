import {
  awbJsonResponse,
  getAwbDocumentForUser,
  isAwbUuid,
  updateAwbFields,
} from "@/lib/awb/persistence";

type FieldUpdate = {
  key: string;
  value: string;
};

function normalizeUpdates(value: unknown): FieldUpdate[] {
  if (!Array.isArray(value)) return [];
  const updates: FieldUpdate[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const fieldValue = typeof row.value === "string" ? row.value.slice(0, 5000) : "";
    if (!/^[a-z0-9_]{1,80}$/.test(key) || seen.has(key)) continue;
    seen.add(key);
    updates.push({ key, value: fieldValue });
  }
  return updates.slice(0, 100);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  if (!isAwbUuid(documentId)) {
    return awbJsonResponse(
      { ok: false, code: "INVALID_DOCUMENT_ID", message: "Invalid AWB document." },
      400
    );
  }
  const body = await request.json().catch(() => ({}));
  const updates = normalizeUpdates(body?.fields);
  if (!updates.length) {
    return awbJsonResponse(
      { ok: false, code: "FIELDS_REQUIRED", message: "Provide at least one AWB field to update." },
      400
    );
  }

  try {
    const access = await getAwbDocumentForUser(request, documentId);
    if (!access) {
      return awbJsonResponse(
        { ok: false, code: "DOCUMENT_NOT_FOUND", message: "AWB document not found." },
        404
      );
    }
    const result = await updateAwbFields(documentId, access.userId, updates);
    return awbJsonResponse({ ok: true, data: result });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "FIELDS_UPDATE_FAILED", message: "Unable to save AWB field changes." },
      500
    );
  }
}

export const runtime = "nodejs";
