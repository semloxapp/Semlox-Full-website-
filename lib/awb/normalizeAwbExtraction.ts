import type {
  AwbExtractedField,
  AwbExtractionResponse,
  AwbFieldStatus,
  NormalizeAwbExtractionOptions,
} from "./types";
import { awbSummaryFromFields } from "./fieldStats";

const AWB_ENTITY_TYPE_MAP: Record<string, { key: string; label: string }> = {
  Airport_of_Departure: { key: "origin_airport", label: "Origin Airport" },
  airport_of_destination: { key: "destination_airport", label: "Destination Airport" },
  House_Airwaybill: { key: "awb_number", label: "AWB Number" },
  Shippers_Name_and_Address: { key: "shipper_name_address", label: "Shipper Name and Address" },
  Consignee_Name_and_Address: { key: "consignee_name_address", label: "Consignee Name and Address" },
  Issued_by: { key: "issuing_carrier", label: "Issuing Carrier" },
  date: { key: "flight_date", label: "Flight Date" },
  number_of_pieces: { key: "pieces", label: "Pieces" },
  pieces_line: { key: "pieces_line", label: "Pieces Line" },
  gross_weight: { key: "gross_weight", label: "Gross Weight" },
  weight_line: { key: "weight_line", label: "Weight Line" },
  chargeable_weight: { key: "chargeable_weight", label: "Chargeable Weight" },
  weight_unit_kg_lb: { key: "weight_unit", label: "Weight Unit" },
  handling_information: { key: "handling_information", label: "Handling Information" },
  nature_and_quantity_goods_discription: {
    key: "nature_and_quantity_of_goods",
    label: "Nature and Quantity of Goods",
  },
  nature_and_quantity_goods_dimensions_or_volume: {
    key: "goods_dimensions_or_volume",
    label: "Goods Dimensions / Volume",
  },
};

type RawEntity = {
  type?: unknown;
  text?: unknown;
  confidence?: unknown;
  need_review?: unknown;
  comment?: unknown;
  page?: unknown;
  source?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function confidenceValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(1, Math.max(0, parsed));
}

function fieldState(value: string, confidence: number, needsReview: boolean) {
  let status: AwbFieldStatus;
  if (!value) status = "missing";
  else if (needsReview || confidence <= 0) status = "review";
  else if (confidence < 0.9) status = "warning";
  else status = "valid";

  return {
    status,
    color: status === "valid" ? "green" : status === "warning" ? "amber" : "red",
  } as const;
}

function normalizeSource(value: unknown): AwbExtractedField["source"] | undefined {
  const source = asRecord(value);
  if (!source) return undefined;
  const boundingBox = asRecord(source.boundingBox);
  const normalizedBoundingBox = boundingBox
    ? {
        x: Number(boundingBox.x) || 0,
        y: Number(boundingBox.y) || 0,
        width: Number(boundingBox.width) || 0,
        height: Number(boundingBox.height) || 0,
      }
    : null;
  const text = typeof source.text === "string" ? source.text : undefined;
  return text || normalizedBoundingBox ? { text, boundingBox: normalizedBoundingBox } : undefined;
}

function normalizeEntity(entity: RawEntity): AwbExtractedField | null {
  const rawType = typeof entity.type === "string" ? entity.type : "";
  const mapping = AWB_ENTITY_TYPE_MAP[rawType];
  if (!mapping) return null;

  const value = typeof entity.text === "string" ? entity.text.trim() : "";
  const confidence = confidenceValue(entity.confidence);
  const needsReview = entity.need_review === true;
  const state = fieldState(value, confidence, needsReview);
  const comment = typeof entity.comment === "string" ? entity.comment.trim() : "";
  const page = Number(entity.page);

  return {
    ...mapping,
    value,
    rawType,
    confidence,
    confidencePercent: Math.round(confidence * 100),
    needsReview: needsReview || state.status === "review" || state.status === "missing",
    comment: comment || undefined,
    status: state.status,
    color: state.color,
    page: Number.isInteger(page) && page > 0 ? page : undefined,
    source: normalizeSource(entity.source),
  };
}

export function normalizeAwbExtractionResponse(
  raw: unknown,
  options: NormalizeAwbExtractionOptions
): AwbExtractionResponse {
  const root = asRecord(raw);
  if (!root || root.success !== true || Number(root.status_code) !== 200) {
    throw new Error("Mock extraction response was not successful.");
  }

  const data = asRecord(root.data);
  const final = asRecord(data?.final);
  const entities = final?.entities;
  if (!Array.isArray(entities)) {
    throw new Error("Mock extraction response does not contain entities.");
  }

  const fieldsByKey = new Map<string, AwbExtractedField>();
  for (const rawEntity of entities) {
    const field = normalizeEntity((asRecord(rawEntity) || {}) as RawEntity);
    if (!field) continue;
    const current = fieldsByKey.get(field.key);
    if (!current || field.confidence > current.confidence) {
      fieldsByKey.set(field.key, field);
    }
  }

  if (!fieldsByKey.size) {
    throw new Error("Extraction response contains no supported AWB fields.");
  }

  for (const mapping of Object.values(AWB_ENTITY_TYPE_MAP)) {
    if (fieldsByKey.has(mapping.key)) continue;
    fieldsByKey.set(mapping.key, {
      ...mapping,
      value: "",
      confidence: 0,
      confidencePercent: 0,
      needsReview: true,
      status: "missing",
      color: "red",
    });
  }

  const fields = [...fieldsByKey.values()];

  const summary = awbSummaryFromFields(fields);
  const meta = asRecord(data?.meta);
  const timing = asRecord(meta?.timing);
  const totalSeconds = Number(timing?.total_seconds);
  const runId =
    typeof meta?.run_id === "string"
      ? meta.run_id
      : typeof root.run_id === "string"
        ? root.run_id
        : undefined;
  const stages = asRecord(meta?.stages);
  const errors = Array.isArray(meta?.errors)
    ? meta.errors.filter((error): error is string => typeof error === "string")
    : [];
  const warnings = fields
    .filter((field) => field.status !== "valid")
    .map((field) => `${field.label}: ${field.comment || (field.status === "warning" ? "Low confidence" : "Review required")}`);

  return {
    ok: true,
    mode: options.mode,
    message: typeof root.message === "string" ? root.message : "AWB processed successfully",
    document: {
      id: options.documentId,
      fileName: options.fileName,
      fileType: options.fileType,
      pages: options.pages || 1,
      status: summary.needsReview > 0 ? "review_required" : "ready_to_issue",
      processingTimeMs: Number.isFinite(totalSeconds) ? Math.round(totalSeconds * 1000) : 0,
      runId,
    },
    summary,
    fields,
    meta: {
      runId,
      stages: stages
        ? Object.fromEntries(
            Object.entries(stages).filter((entry): entry is [string, string] => typeof entry[1] === "string")
          )
        : undefined,
      errors,
      totalSeconds: Number.isFinite(totalSeconds) ? totalSeconds : undefined,
    },
    warnings,
  };
}
