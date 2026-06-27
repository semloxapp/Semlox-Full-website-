import {
  awbJsonResponse,
  createAwbEvent,
  getAwbDocumentForUser,
  getAwbFields,
  isAwbUuid,
  setAwbDocumentIssued,
  toAwbExtractionResponse,
  updateAwbFields,
  validateAwbForIssue,
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
    if (!/^[a-z0-9_]{1,80}$/.test(key) || seen.has(key) || typeof row.value !== "string") continue;
    seen.add(key);
    updates.push({ key, value: row.value.slice(0, 5000) });
  }
  return updates.slice(0, 100);
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
    if (!["owner", "admin", "manager", "operator"].includes(access.role)) {
      return awbJsonResponse(
        { ok: false, code: "ISSUE_FORBIDDEN", message: "Your role cannot issue AWBs." },
        403
      );
    }

    if (updates.length) {
      await updateAwbFields(documentId, access.userId, updates, {
        companyId: access.document.company_id,
        changeSource: "issue_save",
      });
    }
    const fieldRows = await getAwbFields(documentId);
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
    await setAwbDocumentIssued(documentId, issuedExtraction.summary);
    const awbNumber =
      issuedExtraction.fields.find((field) => field.key === "awb_number")?.value ||
      null;
    await createAwbEvent({
      documentId,
      companyId: access.document.company_id,
      userId: access.userId,
      eventType: "issued",
      title: "AWB issued",
      metadata: { awb_number: awbNumber, status: "issued" },
    });
    return awbJsonResponse({
      ok: true,
      message: "AWB issued successfully.",
      data: {
        ...issuedExtraction,
        finalizedFieldKeys: issuedExtraction.fields
          .filter((field) => field.value.trim())
          .map((field) => field.key),
        warnings: validation.warningFields,
      },
    });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "ISSUE_FAILED", message: "Unable to issue the AWB." },
      500
    );
  }
}

export const runtime = "nodejs";
