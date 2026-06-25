import {
  awbJsonResponse,
  createAwbEvent,
  getAwbDocumentForUser,
  isAwbUuid,
  setAwbDocumentDraft,
  updateAwbFields,
} from "@/lib/awb/persistence";

type FieldUpdate = {
  key: string;
  value: string;
};

function normalizeUpdates(value: unknown): FieldUpdate[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const key = typeof row.key === "string" ? row.key.trim() : "";
      if (!/^[a-z0-9_]{1,80}$/.test(key) || typeof row.value !== "string") return [];
      return [{ key, value: row.value.slice(0, 5000) }];
    })
    .slice(0, 100);
}

export async function POST(
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

  try {
    const access = await getAwbDocumentForUser(request, documentId);
    if (!access) {
      return awbJsonResponse(
        { ok: false, code: "DOCUMENT_NOT_FOUND", message: "AWB document not found." },
        404
      );
    }
    const updateResult = updates.length
      ? await updateAwbFields(documentId, access.userId, updates, {
          companyId: access.document.company_id,
          changeSource: "draft_save",
        })
      : { changedCount: 0 };
    await setAwbDocumentDraft(documentId);
    await createAwbEvent({
      documentId,
      companyId: access.document.company_id,
      userId: access.userId,
      eventType: "draft_saved",
      title: "AWB draft saved",
      metadata: { status: "draft", changed_field_count: updateResult.changedCount },
    });
    return awbJsonResponse({ ok: true, message: "Draft saved." });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "DRAFT_SAVE_FAILED", message: "Unable to save the AWB draft." },
      500
    );
  }
}

export const runtime = "nodejs";
