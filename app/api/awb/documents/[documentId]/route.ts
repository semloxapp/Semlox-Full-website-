import {
  awbJsonResponse,
  createAwbSourceSignedUrl,
  getAwbDocumentForUser,
  getAwbFields,
  isAwbUuid,
  toAwbExtractionResponse,
} from "@/lib/awb/persistence";

export async function GET(
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

  try {
    const access = await getAwbDocumentForUser(request, documentId);
    if (!access) {
      return awbJsonResponse(
        { ok: false, code: "DOCUMENT_NOT_FOUND", message: "AWB document not found." },
        404
      );
    }
    const fields = await getAwbFields(documentId);
    const extraction = toAwbExtractionResponse(access.document, fields);
    const sourceUrl =
      access.document.status === "issued"
        ? null
        : await createAwbSourceSignedUrl(access.document.storage_path);
    return awbJsonResponse({
      ok: true,
      data: {
        ...extraction,
        history: {
          uploadedBy: access.document.uploaded_by,
          fileSize: access.document.file_size,
          storagePath: access.document.storage_path,
          sourceUrl,
          createdAt: access.document.created_at,
          updatedAt: access.document.updated_at,
          canEdit:
            access.document.status !== "issued" &&
            (access.document.uploaded_by === access.userId ||
              ["owner", "admin"].includes(access.role)),
        },
      },
    });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "DOCUMENT_FETCH_FAILED", message: "Unable to load the AWB document." },
      500
    );
  }
}

export const runtime = "nodejs";
