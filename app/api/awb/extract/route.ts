import { extractBearerTokenFromRequest, getUserFromAccessToken } from "@/lib/auth";
import { mockAwbApiResponse } from "@/lib/awb/mockAwbApiResponse";
import { normalizeAwbExtractionResponse } from "@/lib/awb/normalizeAwbExtraction";
import {
  authenticateAwbRequest,
  awbJsonResponse,
  createPersistedAwbFailure,
  createPersistedAwbExtraction,
} from "@/lib/awb/persistence";
import { awbTimingServerFlags } from "@/lib/features/awbTimingFlags.server";
import {
  parseProviderTiming,
  timingMetricsFromSummary,
} from "@/lib/awb/timingMetrics";
import type {
  AwbExtractionMode,
  AwbExtractionResponse,
} from "@/lib/awb/types";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 180_000;
const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/x-tiff",
]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "tif", "tiff"]);

type ProviderErrorCode =
  | "AWB_API_NOT_CONFIGURED"
  | "AWB_API_TIMEOUT"
  | "AWB_API_UNAVAILABLE"
  | "AWB_API_BAD_RESPONSE";

class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function extractionMode(): AwbExtractionMode {
  const value = String(process.env.AWB_EXTRACTION_MODE || "mock").toLowerCase();
  return value === "live" || value === "fallback" ? value : "mock";
}

function extractionTimeoutMs() {
  const configured = Number(process.env.AWB_EXTRACTION_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function validFileType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_FILE_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(extension);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasProviderEntities(raw: unknown) {
  const root = asRecord(raw);
  const data = asRecord(root?.data);
  const final = asRecord(data?.final);
  return Array.isArray(final?.entities) && final.entities.length > 0;
}

async function callLiveExtraction(file: File) {
  const apiUrl = process.env.AWB_EXTRACTION_API_URL?.trim();
  if (!apiUrl) {
    throw new ProviderError(
      "AWB_API_NOT_CONFIGURED",
      "AWB extraction service is not configured.",
      503
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), extractionTimeoutMs());
  const providerFormData = new FormData();
  providerFormData.append("file", file, file.name);
  const apiKey = process.env.AWB_EXTRACTION_API_KEY?.trim();
  const startedAt = Date.now();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: providerFormData,
      headers: apiKey ? { "X-Semlox-Api-Key": apiKey } : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const responseText = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new ProviderError(
        "AWB_API_BAD_RESPONSE",
        "AWB extraction returned an unexpected response.",
        502
      );
    }

    console.info("[awb-extract] provider response", {
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    });

    if (!response.ok) {
      throw new ProviderError(
        response.status >= 500 ? "AWB_API_UNAVAILABLE" : "AWB_API_BAD_RESPONSE",
        response.status >= 500
          ? "AWB extraction service is temporarily unavailable. Please try again."
          : "AWB extraction returned an unexpected response.",
        502
      );
    }
    if (!hasProviderEntities(payload)) {
      throw new ProviderError(
        "AWB_API_BAD_RESPONSE",
        "AWB extraction returned an unexpected response.",
        502
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError(
        "AWB_API_TIMEOUT",
        "AWB extraction took too long. Please try again.",
        504
      );
    }
    throw new ProviderError(
      "AWB_API_UNAVAILABLE",
      "AWB extraction service is temporarily unavailable. Please try again.",
      503
    );
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeExtraction(
  raw: unknown,
  mode: AwbExtractionMode,
  file: File
) {
  try {
    return normalizeAwbExtractionResponse(raw, {
      mode,
      documentId: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      pages: 1,
    });
  } catch {
    throw new ProviderError(
      "AWB_API_BAD_RESPONSE",
      "AWB extraction returned an unexpected response.",
      502
    );
  }
}

function normalizeUploadStartedAt(value: FormDataEntryValue | null, receivedAt: string) {
  if (typeof value !== "string") return receivedAt;
  const timestamp = Date.parse(value);
  const receivedTimestamp = Date.parse(receivedAt);
  if (
    !Number.isFinite(timestamp) ||
    timestamp > receivedTimestamp + 5_000 ||
    timestamp < receivedTimestamp - 5 * 60_000
  ) {
    return receivedAt;
  }
  return new Date(timestamp).toISOString();
}

async function getExtraction(
  requestedMode: AwbExtractionMode,
  file: File
): Promise<{
  normalized: AwbExtractionResponse;
  rawResponse: unknown;
  processingTiming: ReturnType<typeof parseProviderTiming>;
}> {
  const normalizeTimed = (rawResponse: unknown, resultMode: AwbExtractionMode) => {
    const normalized = normalizeExtraction(rawResponse, resultMode, file);
    return {
      normalized,
      rawResponse,
      processingTiming: parseProviderTiming(rawResponse),
    };
  };
  if (requestedMode === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return normalizeTimed(mockAwbApiResponse, "mock");
  }

  try {
    const rawResponse = await callLiveExtraction(file);
    return normalizeTimed(rawResponse, "live");
  } catch (error) {
    if (requestedMode !== "fallback" || !(error instanceof ProviderError)) {
      throw error;
    }
    const result = normalizeTimed(mockAwbApiResponse, "fallback");
    result.normalized.message = "Live extraction unavailable. Mock extraction was used.";
    return result;
  }
}

export async function POST(request: Request) {
  const requestReceivedAt = new Date().toISOString();
  const token = await extractBearerTokenFromRequest(request);
  if (!token || !(await getUserFromAccessToken(token))?.id) {
    return awbJsonResponse(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Your session expired. Please sign in again.",
      },
      401
    );
  }

  const formData = await request.formData().catch(() => null);
  const uploadStartedAt = normalizeUploadStartedAt(
    formData?.get("uploadStartedAt") ?? null,
    requestReceivedAt
  );
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return awbJsonResponse(
      {
        ok: false,
        code: "FILE_REQUIRED",
        message: "Select an AWB PDF or image to extract.",
      },
      400
    );
  }
  if (!validFileType(file)) {
    return awbJsonResponse(
      {
        ok: false,
        code: "INVALID_FILE_TYPE",
        message: "Upload a PDF, JPG, PNG, or TIFF file.",
      },
      400
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return awbJsonResponse(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        message: "The AWB file must be 25 MB or smaller.",
      },
      400
    );
  }

  const requestedCompanyId =
    typeof formData?.get("companyId") === "string"
      ? String(formData.get("companyId"))
      : null;
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
  console.info("[awb-extract] request received", {
    fileName: file.name,
    fileSize: file.size,
    mode,
  });

  let extractionResult: Awaited<ReturnType<typeof getExtraction>>;
  try {
    extractionResult = await getExtraction(mode, file);
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(
            "AWB_API_UNAVAILABLE",
            "AWB extraction service is temporarily unavailable. Please try again.",
            503
          );
    console.warn("[awb-extract] provider failure", {
      code: providerError.code,
      mode,
    });
    await createPersistedAwbFailure(
      access,
      file,
      mode
    ).catch(() => null);
    return awbJsonResponse(
      {
        ok: false,
        code: providerError.code,
        message: providerError.message,
      },
      providerError.status
    );
  }

  const {
    normalized,
    rawResponse,
    processingTiming,
  } = extractionResult;
  try {
    const document = await createPersistedAwbExtraction(
      access,
      normalized,
      file,
      rawResponse,
      awbTimingServerFlags.trackingEnabled ? processingTiming : undefined,
      uploadStartedAt
    );
    normalized.document.id = document.id;
    normalized.document.status = document.status;
    if (awbTimingServerFlags.trackingEnabled) {
      normalized.meta.timingMetrics = {
        processing: {
          extractorMs: processingTiming.extractor_ms,
          llmMs: processingTiming.llm_ms,
          businessLogicMs: processingTiming.business_logic_ms,
          totalMs:
            processingTiming.total_ms ??
            normalized.document.processingTimeMs ??
            null,
        },
        review: {
          activeMs: null,
          method: null,
        },
        quality: {
          correctedFieldsCount: null,
        },
        lifecycle: {
          uploadStartedAt,
          reviewReadyAt:
            timingMetricsFromSummary(document.summary).reviewReadyAt,
          issuedAt: null,
          uploadToIssueMs: null,
        },
      };
    }
    console.info("[awb-extract] extraction completed", {
      mode: normalized.mode,
      runId: normalized.meta.runId || null,
      entityCount: normalized.summary.totalFields,
      processingTimeMs: normalized.document.processingTimeMs,
    });
    return awbJsonResponse({ ok: true, data: normalized }, 200);
  } catch {
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
