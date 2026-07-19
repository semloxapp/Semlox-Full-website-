import {
  awbJsonResponse,
  getAwbDocumentForUser,
  isAwbUuid,
  recordReviewCheckpoint,
} from "@/lib/awb/persistence";
import { parseReviewCheckpoint } from "@/lib/awb/timingMetrics";
import { awbTimingServerFlags } from "@/lib/features/awbTimingFlags.server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  if (!isAwbUuid(documentId)) {
    return awbJsonResponse({ ok: false, message: "Invalid AWB document." }, 400);
  }
  const checkpoint = parseReviewCheckpoint(await request.json().catch(() => null));
  if (!checkpoint) {
    return awbJsonResponse({ ok: false, message: "Invalid review checkpoint." }, 400);
  }
  const access = await getAwbDocumentForUser(request, documentId);
  if (!access) {
    return awbJsonResponse({ ok: false, message: "AWB document not found." }, 404);
  }
  if (!awbTimingServerFlags.trackingEnabled) {
    return awbJsonResponse({
      ok: true,
      trackingEnabled: false,
      accepted: false,
      activeMs: null,
    });
  }
  if (access.document.status === "issued") {
    return awbJsonResponse(
      { ok: false, accepted: false, message: "Issued AWB timing is finalized." },
      409
    );
  }
  try {
    const result = await recordReviewCheckpoint(documentId, checkpoint);
    return awbJsonResponse({
      ok: true,
      trackingEnabled: true,
      ...result,
    });
  } catch (error) {
    console.error("[awb-review-time] checkpoint failed", {
      documentId,
      companyId: access.document.company_id,
      reason: checkpoint.reason,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return awbJsonResponse({ ok: false, message: "Review timing could not be saved." }, 500);
  }
}

export const runtime = "nodejs";
