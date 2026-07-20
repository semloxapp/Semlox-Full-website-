import {
  awbJsonResponse,
  buildIssuedTimingSummary,
  getAwbDocumentForUser,
  getAwbFields,
  isAwbUuid,
  setAwbDocumentIssued,
  toAwbExtractionResponse,
  updateAwbFields,
  validateAwbForIssue,
} from "@/lib/awb/persistence";
import { parseReviewCheckpoint } from "@/lib/awb/timingMetrics";
import { awbTimingServerFlags } from "@/lib/features/awbTimingFlags.server";
import { countCorrectedAwbFieldValues } from "@/lib/awb/finalFieldValues";

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
    if (!/^[a-z0-9_]{1,80}$/.test(key) || seen.has(key) || typeof row.value !== "string") continue;
    seen.add(key);
    updates.push({ key, value: row.value.slice(0, 5000) });
  }
  return updates.slice(0, 100);
}

function normalizeIssueClickedAt(value: unknown, requestReceivedAt: string) {
  if (typeof value !== "string") return requestReceivedAt;
  const timestamp = Date.parse(value);
  const receivedTimestamp = Date.parse(requestReceivedAt);
  if (
    !Number.isFinite(timestamp) ||
    timestamp > receivedTimestamp + 5_000 ||
    timestamp < receivedTimestamp - 5 * 60_000
  ) {
    return requestReceivedAt;
  }
  return new Date(timestamp).toISOString();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const operationId = crypto.randomUUID();
  const requestReceivedAt = new Date().toISOString();
  const { documentId } = await params;
  if (!isAwbUuid(documentId)) {
    return awbJsonResponse(
      { ok: false, code: "INVALID_DOCUMENT_ID", message: "Invalid AWB document." },
      400
    );
  }
  const body = await request.json().catch(() => ({}));
  const updates = normalizeUpdates(body?.fields);
  const checkpoint = parseReviewCheckpoint(body?.reviewCheckpoint, "issued");
  const issueClickedAt = normalizeIssueClickedAt(
    body?.issueClickedAt,
    requestReceivedAt
  );

  try {
    const access = await getAwbDocumentForUser(request, documentId);
    if (!access) {
      return awbJsonResponse(
        { ok: false, code: "DOCUMENT_NOT_FOUND", message: "AWB document not found." },
        404
      );
    }
    if (!["owner", "admin", "manager", "operator"].includes(access.role)) {
      return awbJsonResponse(
        { ok: false, code: "ISSUE_FORBIDDEN", message: "Your role cannot issue AWBs." },
        403
      );
    }
    if (access.document.status === "issued") {
      const fieldRows = await getAwbFields(documentId);
      const issuedExtraction = toAwbExtractionResponse(access.document, fieldRows);
      return awbJsonResponse({
        ok: true,
        message: "AWB was already issued.",
        data: {
          ...issuedExtraction,
          finalizedFieldKeys: issuedExtraction.fields
            .filter((field) => field.value.trim())
            .map((field) => field.key),
          warnings: [],
        },
      });
    }

    const persistence = updates.length
      ? await updateAwbFields(documentId, access.userId, updates)
      : null;
    const fieldRows = persistence?.fieldRows ?? await getAwbFields(documentId);
    const extraction = toAwbExtractionResponse(access.document, fieldRows);
    const validation = validateAwbForIssue(extraction.fields);
    if (validation.invalidFields.length) {
      return awbJsonResponse(
        {
          ok: false,
          code: "VALIDATION_FAILED",
          message: "Please fill all required fields before issuing.",
          fields: validation.invalidFields,
          warnings: validation.warningFields,
        },
        400
      );
    }

    const issuedExtraction = toAwbExtractionResponse(
      { ...access.document, status: "issued" },
      fieldRows
    );
    const issuedSummary = awbTimingServerFlags.trackingEnabled
      ? buildIssuedTimingSummary({
          document: access.document,
          fields: fieldRows,
          fieldSummary: issuedExtraction.summary,
          checkpoint,
          issuedAt: issueClickedAt,
        })
      : {
          ...(access.document.summary &&
          typeof access.document.summary === "object" &&
          !Array.isArray(access.document.summary)
            ? access.document.summary
            : {}),
          ...issuedExtraction.summary,
        };
    const correctedFieldsCount = countCorrectedAwbFieldValues(fieldRows);
    console.info("[awb-issue] final fields persisted", {
      operationId,
      documentId,
      receivedFieldCount: updates.length,
      persistedFieldCount: persistence?.persistedCount ?? 0,
      correctedFieldsCount,
    });
    await setAwbDocumentIssued(
      documentId,
      issuedSummary,
      access.document.storage_path
    );
    const finalizedExtraction = toAwbExtractionResponse(
      {
        ...access.document,
        status: "issued",
        storage_path: null,
        summary: issuedSummary,
      },
      fieldRows
    );
    return awbJsonResponse({
      ok: true,
      message: "AWB issued successfully.",
      data: {
        ...finalizedExtraction,
        finalizedFieldKeys: finalizedExtraction.fields
          .filter((field) => field.value.trim())
          .map((field) => field.key),
        warnings: validation.warningFields,
      },
    });
  } catch (error) {
    console.error("[awb-issue] issue failed", {
      operationId,
      documentId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError", message: "Unknown issue failure" },
    });
    return awbJsonResponse(
      { ok: false, code: "ISSUE_FAILED", message: "Unable to issue the AWB." },
      500
    );
  }
}

export const runtime = "nodejs";
