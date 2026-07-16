import {
  awbJsonResponse,
  getAwbDocumentForUser,
  getAwbFields,
  isAwbUuid,
  toAwbExtractionResponse,
} from "@/lib/awb/persistence";
import type { AwbExtractionResponse } from "@/lib/awb/types";

const PDF_SERVICE_URL = "https://semloxai.vercel.app/api/generate-awb";

function finalPdfPayloadFromExtraction(extraction: AwbExtractionResponse) {
  const values = Object.fromEntries(
    extraction.fields.map((field) => [field.key, field.value])
  ) as Record<string, string>;
  return {
    shipper_address: values.shipper_name_address || "",
    consignee_address: values.consignee_name_address || "",
    issued_by: values.issuing_carrier || "",
    airport_departure: values.origin_airport || "",
    airport_destination: values.destination_airport || "",
    awb_number: values.awb_number || "",
    reference_number: values.reference_number || "",
    executed_on_date: values.executed_on_date || "",
    pieces_value: values.pieces || "",
    gross_weight: values.gross_weight || "",
    chargeable_weight: values.chargeable_weight || "",
    weight_unit: values.weight_unit || "",
    handling_info: values.handling_information || "",
    goods_description: values.nature_and_quantity_of_goods || "",
    dimensions_or_volume: values.goods_dimensions_or_volume || "",
  };
}

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
    if (access.document.status !== "issued") {
      return awbJsonResponse(
        {
          ok: false,
          code: "DOCUMENT_NOT_ISSUED",
          message: "PDF export is available after the AWB is issued.",
        },
        409
      );
    }

    const fields = await getAwbFields(documentId);
    const extraction = toAwbExtractionResponse(access.document, fields);
    const pdfResponse = await fetch(PDF_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPdfPayloadFromExtraction(extraction)),
      cache: "no-store",
    });

    if (!pdfResponse.ok) {
      return awbJsonResponse(
        { ok: false, code: "PDF_GENERATION_FAILED", message: "Final PDF generation failed." },
        502
      );
    }

    const headers = new Headers();
    const contentType = pdfResponse.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    return new Response(pdfResponse.body, {
      status: pdfResponse.status,
      headers,
    });
  } catch {
    return awbJsonResponse(
      { ok: false, code: "PDF_EXPORT_FAILED", message: "Unable to export the AWB PDF." },
      500
    );
  }
}

export const runtime = "nodejs";
