import {
  awbJsonResponse,
  getAwbDocumentForUser,
  isAwbUuid,
  recordReviewCheckpoint,
  setAwbDocumentDraft,
  updateAwbFields,
} from "@/lib/awb/persistence";
import { parseReviewCheckpoint } from "@/lib/awb/timingMetrics";
import { awbTimingServerFlags } from "@/lib/features/awbTimingFlags.server";

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
  const checkpoint = parseReviewCheckpoint(body?.reviewCheckpoint, "draft_saved");

  try {
    const access = await getAwbDocumentForUser(request, documentId);
    if (!access) {
      return awbJsonResponse(
        { ok: false, code: "DOCUMENT_NOT_FOUND", message: "AWB document not found." },
        404
      );
    }
    if (updates.length) {
      await updateAwbFields(documentId, access.userId, updates);
    }
    await setAwbDocumentDraft(documentId);
    if (awbTimingServerFlags.trackingEnabled && checkpoint) {
      try {
        await recordReviewCheckpoint(documentId, checkpoint);
      } catch (error) {
        console.error("[awb-draft] review checkpoint failed", {
          documentId,
          companyId: access.document.company_id,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    return awbJsonResponse({ ok: true, message: "Draft saved." });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "DRAFT_SAVE_FAILED", message: "Unable to save the AWB draft." },
      500
    );
  }
}

export const runtime = "nodejs";
