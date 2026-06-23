import { mockAwbApiResponse } from "@/lib/awb/mockAwbApiResponse";
import { normalizeAwbExtractionResponse } from "@/lib/awb/normalizeAwbExtraction";
import {
  authenticateAwbRequest,
  awbJsonResponse,
  createAwbEvent,
  createPersistedAwbExtraction,
} from "@/lib/awb/persistence";
import type { AwbExtractionMode } from "@/lib/awb/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/x-tiff",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "tif", "tiff"]);

function extractionMode(): AwbExtractionMode {
  const value = String(process.env.AWB_EXTRACTION_MODE || "mock").toLowerCase();
  return value === "live" || value === "fallback" ? value : "mock";
}

function validFileType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_FILE_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(extension);
}

export async function POST(request: Request) {
  const token = extractBearerTokenFromRequest(request);
  if (!token || !(await getUserFromAccessToken(token))?.id) {
    return awbJsonResponse(
      { ok: false, code: "UNAUTHORIZED", message: "Your session expired. Please sign in again." },
      401
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return awbJsonResponse(
      { ok: false, code: "FILE_REQUIRED", message: "Select an AWB PDF or image to extract." },
      400
    );
  }
  if (!validFileType(file)) {
    return awbJsonResponse(
      { ok: false, code: "INVALID_FILE_TYPE", message: "Upload a PDF, JPG, PNG, or TIFF file." },
      400
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return awbJsonResponse(
      { ok: false, code: "FILE_TOO_LARGE", message: "The AWB file must be 25 MB or smaller." },
      400
    );
  }

  const requestedCompanyId =
    typeof formData?.get("companyId") === "string" ? String(formData.get("companyId")) : null;
  const access = await authenticateAwbRequest(request, requestedCompanyId);
  if (!access) {
    return awbJsonResponse(
      {
        ok: false,
        code: "COMPANY_ACCESS_REQUIRED",
        message: requestedCompanyId
          ? "You do not have access to the selected company."
          : "Select a company before extracting this AWB.",
      },
      requestedCompanyId ? 403 : 400
    );
  }

  const mode = extractionMode();
  if (mode === "live") {
    return awbJsonResponse(
      {
        ok: false,
        code: "LIVE_EXTRACTION_NOT_CONFIGURED",
        message: "Live extraction provider is not configured yet. Use mock mode for now.",
      },
      503
    );
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const normalized = normalizeAwbExtractionResponse(mockAwbApiResponse, {
      mode,
      documentId: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      pages: 1,
    });
    const document = await createPersistedAwbExtraction(access, normalized, file);
    normalized.document.id = document.id;
    normalized.document.status = document.status;
    await createAwbEvent({
      documentId: document.id,
      companyId: access.companyId,
      userId: access.userId,
      eventType: "extraction_completed",
      title: "AI extraction completed",
      metadata: {
        run_id: normalized.meta.runId || null,
        mode,
        field_count: normalized.summary.totalFields,
        average_confidence: normalized.summary.averageConfidence,
        processing_time_ms: normalized.document.processingTimeMs,
      },
    });
    return awbJsonResponse({ ok: true, data: normalized }, 200);
  } catch {
    await createAwbEvent({
      companyId: access.companyId,
      userId: access.userId,
      eventType: "extraction_failed",
      title: "AI extraction failed",
      message: "The extracted AWB could not be persisted.",
      metadata: { error_code: "AWB_PERSISTENCE_FAILED", mode },
    });
    return awbJsonResponse(
      {
        ok: false,
        code: "AWB_PERSISTENCE_FAILED",
        message: "The AWB was extracted but could not be saved. Please try again.",
      },
      500
    );
  }
}

export const runtime = "nodejs";
import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
