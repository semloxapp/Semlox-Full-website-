"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useCompany } from "../../context/CompanyContext";
import { fetchMemberships } from "../../utils/authClient";
import {
  Activity,
  Bell,
  CheckCircle2,
  CircleAlert,
  FileDown,
  FileText,
  Filter,
  Home,
  LogOut,
  Maximize,
  RotateCw,
  Save,
  Search,
  Settings,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { AwbExtractedField, AwbExtractionResponse } from "@/lib/awb/types";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import AwbPaperContent, {
  getAwbReviewPresentationStats,
} from "./components/AwbPaperContent";

type AwbPhase = "upload" | "processing" | "review";

const MAX_AWB_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_AWB_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "tif", "tiff"]);
const ALLOWED_AWB_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/x-tiff",
]);
const REQUIRED_AWB_FIELDS = [
  "awb_number",
  "shipper_name_address",
  "consignee_name_address",
  "origin_airport",
  "destination_airport",
  "issuing_carrier",
  "flight_date",
  "pieces",
  "gross_weight",
  "chargeable_weight",
  "weight_unit",
  "nature_and_quantity_of_goods",
] as const;

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

function validateAwbFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_AWB_MIME_TYPES.has(file.type) && !ALLOWED_AWB_EXTENSIONS.has(extension)) {
    return "Upload a PDF, JPG, PNG, or TIFF file.";
  }
  if (file.size > MAX_AWB_FILE_BYTES) {
    return "The AWB file must be 25 MB or smaller.";
  }
  return "";
}

function awbPayloadFromExtraction(extraction: AwbExtractionResponse) {
  const values = Object.fromEntries(
    extraction.fields.map((field) => [
      field.key,
      [
        field.value,
        field.confidence,
        field.needsReview,
        field.status,
        field.color,
      ] as const,
    ])
  );
  return {
    airport_departure: values.origin_airport,
    airport_destination: values.destination_airport,
    reference_number: values.awb_number,
    shipper_address: values.shipper_name_address,
    consignee_address: values.consignee_name_address,
    issued_by: values.issuing_carrier,
    flight_date: values.flight_date,
    pieces_value: values.pieces,
    gross_weight: values.gross_weight,
    chargeable_weight: values.chargeable_weight,
    weight_unit: values.weight_unit,
    handling_info: values.handling_information,
    goods_description: values.nature_and_quantity_of_goods,
    dimensions_or_volume: values.goods_dimensions_or_volume,
  };
}

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
    reference_number: values.awb_number || "",
    flight_date: values.flight_date || "",
    pieces_value: values.pieces || "",
    gross_weight: values.gross_weight || "",
    chargeable_weight: values.chargeable_weight || "",
    weight_unit: values.weight_unit || "",
    handling_info: values.handling_information || "",
    goods_description: values.nature_and_quantity_of_goods || "",
    dimensions_or_volume: values.goods_dimensions_or_volume || "",
  };
}

function validateReviewForIssue(fields: AwbExtractedField[]) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const invalidKeys = REQUIRED_AWB_FIELDS.filter((key) => {
    const field = byKey.get(key);
    return Boolean(field && !field.value.trim());
  });
  const unmappedKeys = REQUIRED_AWB_FIELDS.filter((key) => !byKey.has(key));
  return { invalidKeys, unmappedKeys };
}

const PAPER_PAYLOAD_TO_FIELD_KEY: Record<string, string> = {
  reference_number: "awb_number",
  shipper_address: "shipper_name_address",
  consignee_address: "consignee_name_address",
  airport_departure: "origin_airport",
  airport_destination: "destination_airport",
  issued_by: "issuing_carrier",
  flight_date: "flight_date",
  pieces_value: "pieces",
  gross_weight: "gross_weight",
  chargeable_weight: "chargeable_weight",
  weight_unit: "weight_unit",
  handling_info: "handling_information",
  goods_description: "nature_and_quantity_of_goods",
  dimensions_or_volume: "goods_dimensions_or_volume",
};

function summarizeReviewFields(fields: AwbExtractedField[]): AwbExtractionResponse["summary"] {
  const capturedFields = fields.filter((field) => field.value.trim()).length;
  const averageConfidence = fields.length
    ? fields.reduce((total, field) => total + field.confidence, 0) / fields.length
    : 0;
  return {
    totalFields: fields.length,
    capturedFields,
    averageConfidence,
    averageConfidencePercent: Math.round(averageConfidence * 100),
    needsReview: fields.filter((field) => field.status !== "valid").length,
    validFields: fields.filter((field) => field.status === "valid").length,
    warningFields: fields.filter((field) => field.status === "warning").length,
    missingFields: fields.filter((field) => field.status === "missing").length,
  };
}

function Sidebar() {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#070B17] px-2 py-3 text-white">
      <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
        Menu
      </div>

      <nav className="space-y-1">
        <Link href="/dashboard" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Home className="h-3.5 w-3.5" />
          Overview
        </Link>

        <Link href="/dashboard/awb" className="flex h-[30px] items-center justify-between rounded-[6px] border border-[#1B3B73] bg-[#0D1B35] px-3 text-[11px] font-bold text-white shadow-[inset_3px_0_0_#2F80FF]">
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            AWB Processing
          </span>
          <span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[#123D8A] text-[8px] font-bold text-[#4F8BFF]">
            3
          </span>
        </Link>

        <Link href="/dashboard/history" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Activity className="h-3.5 w-3.5" />
          History
        </Link>

        <Link href="/dashboard/settings" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </nav>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <div className="rounded-[7px] border border-[#17325F] bg-[#0A1530] p-3">
          <h3 className="text-[10px] font-bold text-white">Enterprise Plan</h3>
          <p className="mt-1 text-[8px] text-[#7D8EA8]">10,000 AWBs/month</p>
          <div className="mt-2 h-[3px] w-full rounded-full bg-[#132746]">
            <div className="h-full w-[48%] rounded-full bg-[#00D9FF]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[8px]">
            <span className="text-[#2F80FF]">4,823</span>
            <span className="text-[#64748B]">of 10,000 used</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
          Support
        </div>

        <a className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <FileText className="h-3.5 w-3.5" />
          Documentation
        </a>
      </div>

      <Link href="/logout" className="mt-auto mb-3 flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </Link>

      <div className="flex items-center justify-between px-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[9px] font-bold text-white">
            AK
          </div>

          <div className="leading-none">
            <h4 className="text-[10px] font-bold text-white">Anna Keller</h4>
            <p className="mt-1 text-[8px] text-[#64748B]">DB Schenker Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

void Sidebar;
void AppHeader;

function AppHeader() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[200] flex h-[42px] items-center justify-between border-b border-white/[0.08] bg-[#070B17] px-5 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2F80FF]">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          <div className="leading-none">
            <h1 className="text-[12px] font-bold">SemloX</h1>
            <p className="mt-1 text-[8px] tracking-[0.1em] text-[#64748B]">
              AI DOCUMENT ENGINE
            </p>
          </div>
        </div>

        <div className="ml-12 h-10 w-px bg-white/[0.09]" />

        <div className="ml-3 leading-none">
          <h2 className="mb-0.5 text-[11px] font-semibold text-white">AWB Processing</h2>
          <p className="text-[8px] text-[#64748B]">
            DB Schenker Logistics
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-3 py-[5px] text-[10px] font-semibold text-white shadow-md hover:opacity-90">
          <Upload className="h-3 w-3" />
          Upload AWB
        </button>

        <button className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Filter className="h-3.5 w-3.5 text-[#64748B]" />
        </button>

        <button className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Bell className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold">
          AK
        </div>
      </div>
    </div>
  );
}

function ProcessingView({
  fileName,
  error,
  onRetry,
  onChooseAnother,
}: {
  fileName: string;
  error: string;
  onRetry: () => void;
  onChooseAnother: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-[radial-gradient(circle_at_35%_35%,rgba(59,130,246,0.08),transparent_32%),linear-gradient(90deg,#20242d_0%,#20242d_42%,#070b17_52%,#050813_100%)] px-5">
      <div className="flex w-full max-w-[560px] items-center rounded-[9px] border border-white/[0.08] bg-[#070b17]/80 px-4 py-3 text-[10px] font-bold text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-3 w-3" />
          </span>
          Upload complete
        </div>
        <div className="mx-3 h-px flex-1 bg-[#2f80ff]" />
        <div className="flex items-center gap-2">
          <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${error ? "bg-red-500" : "bg-[#2f80ff]"}`}>
            {error ? <CircleAlert className="h-3 w-3" /> : "02"}
          </span>
          AI Extract
        </div>
        <div className="mx-3 h-px flex-1 bg-white/[0.10]" />
        <div className="flex items-center gap-2 text-[#64748b]">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/10">
            03
          </span>
          Review Fields
        </div>
      </div>
      <div className="relative flex min-h-[220px] w-full max-w-[340px] flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.035] px-[26px] py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {error ? (
          <CircleAlert className="mb-4 h-[46px] w-[46px] text-red-400" />
        ) : (
          <div className="mb-[18px] h-[46px] w-[46px] animate-spin rounded-full border-2 border-[#334155] border-t-[#2f80ff]" />
        )}

        <h2 className="text-[13px] font-extrabold leading-none text-[#f8fafc]">
          {error ? "Extraction could not be completed" : `Processing ${fileName}`}
        </h2>

        <p className="mt-2 max-w-[250px] text-[9px] leading-[1.4] text-[#64748b]">
          {error || "Extracting AWB fields..."}
        </p>

        {error ? (
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={onChooseAnother} className="h-8 rounded-[7px] border border-white/10 bg-white/[0.04] px-3 text-[10px] font-semibold text-[#94a3b8]">
              Choose another
            </button>
            <button type="button" onClick={onRetry} className="h-8 rounded-[7px] bg-[#2f80ff] px-4 text-[10px] font-bold text-white">
              Retry extraction
            </button>
          </div>
        ) : (
          <>
            <div className="mt-[13px] h-[2px] w-full overflow-hidden bg-[#1e293b]">
              <div className="h-full w-[72%] animate-pulse bg-gradient-to-r from-[#2f80ff] to-[#00d9ff]" />
            </div>
            <div className="mt-[13px] font-mono text-[9px] text-[#00d9ff]">
              Validating extracted fields...
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AwbDocumentPreview({
  fileName,
  data,
  pages,
  onSaveDraft,
  onExportFinalPdf,
  onPaperFieldChange,
  savingDraft,
  exportingPdf,
  readOnly,
}: {
  fileName: string;
  data: Record<string, unknown>;
  pages: number;
  onSaveDraft: () => void;
  onExportFinalPdf: () => void;
  onPaperFieldChange: (payloadKey: string, value: string) => void;
  savingDraft: boolean;
  exportingPdf: boolean;
  readOnly: boolean;
}) {
  const PAPER_WIDTH = 760;
  const PAPER_HEIGHT = PAPER_WIDTH * (297 / 210);
  const pageCount = Math.max(1, pages);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [fitPreview, setFitPreview] = useState(true);
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState(620);
  const [lensPosition, setLensPosition] = useState({
    left: 290,
    top: 110,
    contentX: 250,
    contentY: 90,
  });
  const availablePaperWidth = Math.max(320, viewerWidth - 32);
  const fitScale = fitPreview
    ? Math.min(1, availablePaperWidth / PAPER_WIDTH)
    : 1;
  const zoomScale = fitScale * (zoom / 100);
  const scaledPaperWidth = PAPER_WIDTH * zoomScale;
  const scaledPaperHeight = PAPER_HEIGHT * zoomScale;
  const reviewStats = getAwbReviewPresentationStats(data);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const updateWidth = () => setViewerWidth(viewer.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  const moveLens = (event: PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const paperRect = paperRef.current?.getBoundingClientRect();
    if (!paperRect) return;

    const left = event.clientX - containerRect.left + container.scrollLeft;
    const top = event.clientY - containerRect.top + container.scrollTop;
    const contentX =
      Math.min(paperRect.width, Math.max(0, event.clientX - paperRect.left)) /
      zoomScale;
    const contentY =
      Math.min(paperRect.height, Math.max(0, event.clientY - paperRect.top)) /
      zoomScale;

    setLensPosition({
      left,
      top,
      contentX,
      contentY,
    });
  };

  return (
    <div className={`awb-document-preview flex h-full min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-[#0a0e1a] ${readOnly ? "awb-preview-readonly" : ""}`}>
      <div className="awb-preview-toolbar flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.08] bg-[#111726] px-3 py-2">
        <FileText className="h-3.5 w-3.5 text-[#ff4d5d]" />
        <span className="max-w-[150px] truncate font-mono text-[10px] font-bold text-white sm:max-w-[190px]">
          {fileName}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-[#64748b]">
          {pageCount} {pageCount === 1 ? "page" : "pages"}
        </span>
        <div className="ml-auto flex max-w-full items-center gap-2 overflow-x-auto font-mono text-[10px] text-white">
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-6 w-6 rounded border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">&lsaquo;</button>
          <span className="rounded border border-white/10 bg-white/[0.05] px-3 py-1">{page}</span>
          <span className="text-[#64748b]">/ {pageCount}</span>
          <button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="h-6 w-6 rounded border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">&rsaquo;</button>
          <button onClick={() => setZoom((current) => Math.max(75, current - 10))} className="ml-3 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">
            <ZoomOut className="h-3 w-3" />
          </button>
          <span className="min-w-9 text-center font-extrabold">{zoom}%</span>
          <button onClick={() => setZoom((current) => Math.min(140, current + 10))} className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">
            <ZoomIn className="h-3 w-3" />
          </button>
          <button onClick={() => setFitPreview((current) => !current)} className={`flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${fitPreview ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <Maximize className="h-3 w-3" />
          </button>
          <button onClick={() => setMagnifierActive((current) => !current)} className={`ml-1 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border ${magnifierActive ? "border-[#2f80ff]/50 bg-[#2f80ff]/15 text-[#60a5fa]" : "border-white/10 bg-white/[0.04] text-[#64748b]"}`}>
            <Search className="h-3 w-3" />
          </button>
          <button onClick={() => setRotation((current) => (current + 90) % 360)} className={`flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${rotation ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <RotateCw className="h-3 w-3" />
          </button>
          <button onClick={() => setEnhanced((current) => !current)} className={`ml-1 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${enhanced ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <Filter className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="awb-preview-review-summary flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.08] bg-[#0d1321] px-3 py-2">
        <div className="mr-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
          Review summary
        </div>
        <div className="awb-preview-status-chip awb-preview-status-chip-extracted flex items-center gap-1.5 rounded-[6px] border border-emerald-400/35 bg-emerald-400/[0.12] px-2.5 py-1 text-[9px] font-medium text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Extracted
          <strong className="font-mono text-[10px] text-emerald-100">
            {reviewStats.extracted}
          </strong>
        </div>
        <div className="awb-preview-status-chip awb-preview-status-chip-review flex items-center gap-1.5 rounded-[6px] border border-amber-400/35 bg-amber-400/[0.12] px-2.5 py-1 text-[9px] font-medium text-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          Review
          <strong className="font-mono text-[10px] text-amber-100">
            {reviewStats.review}
          </strong>
        </div>
        <div className="awb-preview-status-chip awb-preview-status-chip-empty flex items-center gap-1.5 rounded-[6px] border border-slate-400/25 bg-slate-400/[0.1] px-2.5 py-1 text-[9px] font-medium text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          Empty
          <strong className="font-mono text-[10px] text-slate-100">
            {reviewStats.empty}
          </strong>
        </div>
        <div className="awb-preview-status-chip awb-preview-status-chip-confidence ml-auto flex items-center gap-1.5 rounded-[6px] border border-[#2f80ff]/40 bg-[#2f80ff]/15 px-2.5 py-1 text-[9px] font-medium text-blue-200">
          AI Conf
          <strong className="font-mono text-[10px] text-blue-100">
            {reviewStats.averageConfidence == null
              ? "--"
              : `${reviewStats.averageConfidence}%`}
          </strong>
        </div>
      </div>

      <div
        ref={viewerRef}
        onPointerMove={moveLens}
        className="awb-document-scroll relative min-h-0 flex-1 overflow-auto bg-[#1b2232] px-4 py-5"
      >
        <div
          className="relative mx-auto"
          style={{
            width: `${scaledPaperWidth}px`,
            height: `${scaledPaperHeight}px`,
          }}
        >
          <div
            ref={paperRef}
            className={`absolute left-0 top-0 w-[760px] overflow-hidden rounded-[3px] bg-white font-mono text-[#0f172a] shadow-[0_22px_55px_rgba(0,0,0,0.45)] ring-1 ring-black/80 transition-transform duration-200 ${enhanced ? "contrast-125 saturate-125" : ""}`}
            style={{
              transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
              transformOrigin: "top left",
            }}
          >
            <AwbPaperContent
              data={data}
              onSaveDraft={onSaveDraft}
              onExportFinalPdf={onExportFinalPdf}
              onFieldChange={onPaperFieldChange}
              savingDraft={savingDraft}
              exportingPdf={exportingPdf}
              showActions={false}
            />
          </div>
        </div>
        {magnifierActive && (
          <div
            className="pointer-events-none absolute z-20 flex h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-[#3b82f6] bg-white text-[#0f172a] shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(59,130,246,0.18)] [clip-path:circle(50%_at_50%_50%)]"
            style={{ left: `${lensPosition.left}px`, top: `${lensPosition.top}px` }}
          >
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#3b82f6]/60" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#3b82f6]/30" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3b82f6]/70" />
            <div
              className="absolute w-[760px] bg-white font-mono text-[#0f172a] will-change-transform"
              style={{
                left: `calc(50% - ${lensPosition.contentX * 2}px)`,
                top: `calc(50% - ${lensPosition.contentY * 2}px)`,
                transform: "scale(2)",
                transformOrigin: "top left",
              }}
            >
              <AwbPaperContent data={data} showActions={false} />
            </div>
          </div>
        )}
      </div>

      <div className="awb-preview-actions flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/[0.08] bg-[#0d1321] px-3 py-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={readOnly || savingDraft || exportingPdf}
          className="inline-flex h-9 min-w-[132px] items-center justify-center gap-2 rounded-[7px] border border-white/10 bg-white/[0.04] px-4 text-[10px] font-semibold text-[#cbd5e1] transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f80ff]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {savingDraft ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={onExportFinalPdf}
          disabled={readOnly || savingDraft || exportingPdf}
          className="inline-flex h-9 min-w-[168px] items-center justify-center gap-2 rounded-[7px] bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] px-4 text-[10px] font-bold text-white shadow-[0_8px_24px_rgba(47,128,255,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#2f80ff]/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileDown className="h-3.5 w-3.5" />
          {exportingPdf ? "Issuing..." : "Issue & Export PDF"}
        </button>
      </div>

      <style jsx global>{`
        .awb-document-scroll {
          scrollbar-width: thin;
          scrollbar-color: #64748b #111827;
        }

        .awb-document-scroll::-webkit-scrollbar {
          width: 9px;
          height: 0;
        }

        .awb-document-scroll::-webkit-scrollbar-track {
          background: #111827;
        }

        .awb-document-scroll::-webkit-scrollbar-thumb {
          background: #64748b;
          border: 2px solid #111827;
          border-radius: 999px;
        }

        .awb-document-scroll textarea,
        .awb-document-scroll input,
        .awb-document-scroll select {
          scrollbar-width: none;
        }

        .awb-document-scroll textarea::-webkit-scrollbar,
        .awb-document-scroll input::-webkit-scrollbar,
        .awb-document-scroll select::-webkit-scrollbar {
          display: none;
        }

        .awb-document-scroll .awb-form input,
        .awb-document-scroll .awb-form textarea,
        .awb-document-scroll .awb-form select {
          background: transparent;
          color: #020617;
          vertical-align: middle;
        }

        .awb-document-scroll .awb-form input:disabled,
        .awb-document-scroll .awb-form textarea:disabled,
        .awb-document-scroll .awb-form select:disabled {
          cursor: not-allowed;
          background: #e5e7eb !important;
          color: #94a3b8 !important;
          opacity: 0.78;
        }

        .awb-preview-readonly .awb-form input,
        .awb-preview-readonly .awb-form textarea,
        .awb-preview-readonly .awb-form select,
        .awb-preview-readonly .awb-form button {
          pointer-events: none;
        }

        .awb-document-scroll .awb-form label,
        .awb-document-scroll .awb-form textarea,
        .awb-document-scroll .awb-form input,
        .awb-document-scroll .awb-form select {
          line-height: 1.15;
        }

        .awb-document-scroll .awb-form * {
          box-sizing: border-box;
        }

        .awb-document-scroll .awb-form input,
        .awb-document-scroll .awb-form textarea {
          min-width: 0;
        }

        .awb-document-scroll .awb-form input {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .awb-document-scroll .awb-form .awb-modern-paper textarea {
          overflow: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .awb-document-scroll .awb-form .awb-modern-paper input:disabled::placeholder,
        .awb-document-scroll .awb-form .awb-modern-paper textarea:disabled::placeholder {
          color: #94a3b8;
          font-size: 8px;
          opacity: 0.72;
        }

        .awb-document-scroll .awb-form label,
        .awb-document-scroll .awb-form span,
        .awb-document-scroll .awb-form div {
          overflow-wrap: anywhere;
        }

        .awb-document-scroll .awb-form div:has(> #shipper-name-address),
        .awb-document-scroll .awb-form div:has(> #input-shipper-account-no),
        .awb-document-scroll .awb-form div:has(> #issued-by),
        .awb-document-scroll .awb-form div:has(> #consignee-name-address),
        .awb-document-scroll .awb-form div:has(> #consignee-account-number),
        .awb-document-scroll .awb-form div:has(> #issuing-carrier-agent-iata-code),
        .awb-document-scroll .awb-form div:has(> #departure-airport),
        .awb-document-scroll .awb-form div:has(> #routing-and-destination),
        .awb-document-scroll .awb-form div:has(> #by-first-carrier),
        .awb-document-scroll .awb-form div:has(> #destination-airport),
        .awb-document-scroll .awb-form div:has(> #shipment-referente-number),
        .awb-document-scroll .awb-form div:has(> #shipment-referente-information),
        .awb-document-scroll .awb-form div:has(> #currency),
        .awb-document-scroll .awb-form div:has(> #CHGS),
        .awb-document-scroll .awb-form div:has(> #wt_val_ppd_mark),
        .awb-document-scroll .awb-form div:has(> #wt_val_coll_mark),
        .awb-document-scroll .awb-form div:has(> #pieces),
        .awb-document-scroll .awb-form div:has(> #gross-weight),
        .awb-document-scroll .awb-form div:has(> #weight-unit),
        .awb-document-scroll .awb-form div:has(> #rate-class-code),
        .awb-document-scroll .awb-form div:has(> #rate_class_value),
        .awb-document-scroll .awb-form div:has(> #chargeable-weight),
        .awb-document-scroll .awb-form div:has(> #rate-charge),
        .awb-document-scroll .awb-form div:has(> #total),
        .awb-document-scroll .awb-form div:has(> #nature-and-quantity-of-goods),
        .awb-document-scroll .awb-form div:has(> #pieces_value_total),
        .awb-document-scroll .awb-form div:has(> #gross_weight_total),
        .awb-document-scroll .awb-form div:has(> #total_final_value) {
          background-color: #e4f8f2;
        }

        .awb-document-scroll .awb-form div:has(> #shipper-phone-number),
        .awb-document-scroll .awb-form div:has(> #issuing-carrier-agent-name-and-city),
        .awb-document-scroll .awb-form div:has(> #issuing-carrier-agent-account-no),
        .awb-document-scroll .awb-form div:has(> #value-for-carriage),
        .awb-document-scroll .awb-form div:has(> #other_ppd_mark),
        .awb-document-scroll .awb-form div:has(> #other_coll_mark),
        .awb-document-scroll .awb-form div:has(> #charges-declaration-other) {
          background-color: #fff1dc;
        }

        .awb-document-scroll .awb-form div:has(> #consignee-phone-number),
        .awb-document-scroll .awb-form div:has(> #requested-flight),
        .awb-document-scroll .awb-form div:has(> #requested-date),
        .awb-document-scroll .awb-form div:has(> #value-for-customs),
        .awb-document-scroll .awb-form div:has(> #amount-of-insurance),
        .awb-document-scroll .awb-form div:has(> #handling-information),
        .awb-document-scroll .awb-form div:has(> #special-handling-codes),
        .awb-document-scroll .awb-form div:has(> #other-customs-information),
        .awb-document-scroll .awb-form div:has(> #Weight-charge-collect),
        .awb-document-scroll .awb-form div:has(> #valuation_collect),
        .awb-document-scroll .awb-form div:has(> #tax-collect),
        .awb-document-scroll .awb-form div:has(> #total_other_charges_due_agent_collect),
        .awb-document-scroll .awb-form div:has(> #total_other_charges_due_carrier_collect),
        .awb-document-scroll .awb-form div:has(> #total-collected),
        .awb-document-scroll .awb-form div:has(> #amount-of-insurance) {
          background-color: #ffe4e6;
        }

        .awb-document-scroll .awb-form #shipper-name-address,
        .awb-document-scroll .awb-form #input-shipper-account-no,
        .awb-document-scroll .awb-form #issued-by,
        .awb-document-scroll .awb-form #consignee-name-address,
        .awb-document-scroll .awb-form #consignee-account-number,
        .awb-document-scroll .awb-form #issuing-carrier-agent-iata-code,
        .awb-document-scroll .awb-form #departure-airport,
        .awb-document-scroll .awb-form #routing-and-destination,
        .awb-document-scroll .awb-form #by-first-carrier,
        .awb-document-scroll .awb-form #destination-airport,
        .awb-document-scroll .awb-form #shipment-referente-number,
        .awb-document-scroll .awb-form #shipment-referente-information,
        .awb-document-scroll .awb-form #currency,
        .awb-document-scroll .awb-form #CHGS,
        .awb-document-scroll .awb-form #wt_val_ppd_mark,
        .awb-document-scroll .awb-form #wt_val_coll_mark,
        .awb-document-scroll .awb-form #pieces,
        .awb-document-scroll .awb-form #gross-weight,
        .awb-document-scroll .awb-form #weight-unit,
        .awb-document-scroll .awb-form #rate-class-code,
        .awb-document-scroll .awb-form #rate_class_value,
        .awb-document-scroll .awb-form #chargeable-weight,
        .awb-document-scroll .awb-form #rate-charge,
        .awb-document-scroll .awb-form #total,
        .awb-document-scroll .awb-form #nature-and-quantity-of-goods,
        .awb-document-scroll .awb-form #pieces_value_total,
        .awb-document-scroll .awb-form #gross_weight_total,
        .awb-document-scroll .awb-form #total_final_value {
          background-color: #e4f8f2;
        }

        .awb-document-scroll .awb-form #shipper-phone-number,
        .awb-document-scroll .awb-form #issuing-carrier-agent-name-and-city,
        .awb-document-scroll .awb-form #issuing-carrier-agent-account-no,
        .awb-document-scroll .awb-form #value-for-carriage,
        .awb-document-scroll .awb-form #other_ppd_mark,
        .awb-document-scroll .awb-form #other_coll_mark,
        .awb-document-scroll .awb-form #charges-declaration-other {
          background-color: #fff1dc;
        }

        .awb-document-scroll .awb-form #consignee-phone-number,
        .awb-document-scroll .awb-form #requested-flight,
        .awb-document-scroll .awb-form #requested-date,
        .awb-document-scroll .awb-form #value-for-customs,
        .awb-document-scroll .awb-form #amount-of-insurance,
        .awb-document-scroll .awb-form #handling-information,
        .awb-document-scroll .awb-form #special-handling-codes,
        .awb-document-scroll .awb-form #other-customs-information,
        .awb-document-scroll .awb-form #Weight-charge-collect,
        .awb-document-scroll .awb-form #valuation_collect,
        .awb-document-scroll .awb-form #tax-collect,
        .awb-document-scroll .awb-form #total_other_charges_due_agent_collect,
        .awb-document-scroll .awb-form #total_other_charges_due_carrier_collect,
        .awb-document-scroll .awb-form #total-collected {
          background-color: #ffe4e6;
        }
      `}</style>
    </div>
  );
}

function UploadedPdfPanel({
  fileName,
  pdfUrl,
  sourceStored = true,
}: {
  fileName: string;
  pdfUrl: string | null;
  sourceStored?: boolean;
}) {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [lensVisible, setLensVisible] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [previewLoading, setPreviewLoading] = useState(Boolean(pdfUrl));
  const [previewError, setPreviewError] = useState("");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderGenerationRef = useRef(0);
  const [lensPosition, setLensPosition] = useState({
    left: 0,
    top: 0,
  });

  useEffect(() => {
    if (!pdfUrl || !isPdf) return;

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    void import("pdfjs-dist")
      .then((pdfjs) => {
        if (cancelled) return null;
        setPreviewLoading(true);
        setPreviewError("");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        loadingTask = pdfjs.getDocument({ url: pdfUrl });
        return loadingTask.promise;
      })
      .then((document) => {
        if (!document) return;
        if (cancelled) {
          return;
        }
        setPdfDocument(document);
        setPageCount(document.numPages);
        setPageNumber(1);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewError("Unable to render the source PDF preview.");
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      if (loadingTask) void loadingTask.destroy();
    };
  }, [isPdf, pdfUrl]);

  useEffect(() => {
    if (!pdfDocument || !isPdf) return;
    const document = pdfDocument;
    let cancelled = false;
    const generation = ++renderGenerationRef.current;

    async function renderPage() {
      const previousTask = renderTaskRef.current;
      if (previousTask) {
        previousTask.cancel();
        try {
          await previousTask.promise;
        } catch {
          // Cancellation is expected when page or zoom changes.
        }
        if (renderTaskRef.current === previousTask) {
          renderTaskRef.current = null;
        }
      }

      const page = await document.getPage(pageNumber);
      if (cancelled || generation !== renderGenerationRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const displayScale = 1.25 * (zoom / 100);
        const displayViewport = page.getViewport({ scale: displayScale });
        const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const qualityScale = Math.min(3, Math.max(2, devicePixelRatio * 2));
        const renderViewport = page.getViewport({
          scale: displayScale * qualityScale,
        });
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: renderViewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (
          !cancelled &&
          generation === renderGenerationRef.current &&
          renderTaskRef.current === renderTask
        ) {
          renderTaskRef.current = null;
          setPreviewLoading(false);
          setPreviewError("");
        }
    }

    void renderPage().catch((error: unknown) => {
        if (
          !cancelled &&
          generation === renderGenerationRef.current &&
          (!(error instanceof Error) || error.name !== "RenderingCancelledException")
        ) {
          if (process.env.NODE_ENV !== "production") {
            console.log(
              "[awb-source-preview] PDF page render failed",
              error instanceof Error ? error.message : "Unknown render error"
            );
          }
          setPreviewError("Unable to render the source PDF preview.");
          setPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [isPdf, pageNumber, pdfDocument, zoom]);

  useEffect(() => {
    if (!pdfUrl || isPdf) return;
    let cancelled = false;
    const image = new Image();
    queueMicrotask(() => {
      if (!cancelled) {
        setPreviewLoading(true);
        setPreviewError("");
      }
    });
    image.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      const scale = zoom / 100;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.style.width = `${Math.floor(image.naturalWidth * scale)}px`;
      canvas.style.height = `${Math.floor(image.naturalHeight * scale)}px`;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      setPageCount(1);
      setPageNumber(1);
      setPreviewLoading(false);
    };
    image.onerror = () => {
      if (!cancelled) {
        setPreviewError("This source image cannot be rendered in preview mode.");
        setPreviewLoading(false);
      }
    };
    image.src = pdfUrl;
    return () => {
      cancelled = true;
      image.src = "";
    };
  }, [isPdf, pdfUrl, zoom]);

  const moveLens = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!magnifierActive) return;
    const canvas = canvasRef.current;
    const lensCanvas = lensCanvasRef.current;
    if (!canvas || !lensCanvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLensVisible(false);
      return;
    }

    const lensSize = 145;
    const magnification = 2;
    const pixelRatioX = canvas.width / rect.width;
    const pixelRatioY = canvas.height / rect.height;
    const sourceWidth = (lensSize / magnification) * pixelRatioX;
    const sourceHeight = (lensSize / magnification) * pixelRatioY;
    const sourceX = x * pixelRatioX - sourceWidth / 2;
    const sourceY = y * pixelRatioY - sourceHeight / 2;
    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const outputRatio = Math.min(3, Math.max(2, devicePixelRatio * 2));
    const lensContext = lensCanvas.getContext("2d");
    if (!lensContext) return;

    lensCanvas.width = Math.floor(lensSize * outputRatio);
    lensCanvas.height = Math.floor(lensSize * outputRatio);
    lensCanvas.style.width = `${lensSize}px`;
    lensCanvas.style.height = `${lensSize}px`;
    lensContext.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
    lensContext.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      lensCanvas.width,
      lensCanvas.height
    );
    setLensPosition({ left: x, top: y });
    setLensVisible(true);
  };

  return (
    <div className="awb-uploaded-pdf-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.03]">
      <div className="flex h-10 shrink-0 items-center border-b border-white/[0.08] px-3">
        <div className="text-[12px] font-extrabold">Source Document</div>
        <span className="ml-2 min-w-0 truncate font-mono text-[9px] text-[#64748b]">
          {fileName}
        </span>
        {pdfUrl ? (
          <div className="ml-auto flex items-center gap-1.5 font-mono text-[9px] text-[#94a3b8]">
            {isPdf ? (
              <>
                <button
                  type="button"
                  title="Previous page"
                  disabled={pageNumber <= 1 || previewLoading}
                  onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                  className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
                >
                  &lsaquo;
                </button>
                <span className="min-w-[40px] text-center">{pageNumber}/{pageCount}</span>
                <button
                  type="button"
                  title="Next page"
                  disabled={pageNumber >= pageCount || previewLoading}
                  onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}
                  className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
                >
                  &rsaquo;
                </button>
              </>
            ) : null}
            <button
              type="button"
              title="Zoom out"
              disabled={zoom <= 75 || previewLoading}
              onClick={() => setZoom((current) => Math.max(75, current - 25))}
              className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="min-w-[34px] text-center">{zoom}%</span>
            <button
              type="button"
              title="Zoom in"
              disabled={zoom >= 200 || previewLoading}
              onClick={() => setZoom((current) => Math.min(200, current + 25))}
              className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          title="Magnifier"
          aria-label="Magnifier"
          aria-pressed={magnifierActive}
          disabled={!pdfUrl}
          onClick={() => {
            setMagnifierActive((current) => !current);
            setLensVisible(false);
          }}
          className={`flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[5px] border transition disabled:cursor-not-allowed disabled:opacity-40 ${
            magnifierActive
              ? "border-[#2f80ff]/50 bg-[#2f80ff]/15 text-[#60a5fa]"
              : "border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white"
          }`}
        >
          <Search className="h-3 w-3" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#171d2d] p-3">
        {pdfUrl ? (
          <div className="relative min-h-[520px] min-w-full">
            <div className="relative mx-auto w-fit">
              <canvas
                ref={canvasRef}
                onPointerMove={moveLens}
                onPointerLeave={() => setLensVisible(false)}
                className="block max-w-none bg-white shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
              />
              {magnifierActive ? (
                <div
                  className={`pointer-events-none absolute z-20 h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#3b82f6] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(59,130,246,0.18)] transition-opacity duration-75 [clip-path:circle(50%_at_50%_50%)] ${
                    lensVisible ? "visible opacity-100" : "invisible opacity-0"
                  }`}
                  style={{ left: `${lensPosition.left}px`, top: `${lensPosition.top}px` }}
                >
                  <canvas
                    ref={lensCanvasRef}
                    aria-hidden="true"
                    className="h-[145px] w-[145px]"
                  />
                  <div className="absolute inset-x-0 top-1/2 h-px bg-[#3b82f6]/60" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-[#3b82f6]/30" />
                  <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3b82f6]/70" />
                </div>
              ) : null}
            </div>
            {previewLoading ? (
              <div className="absolute inset-0 flex min-h-[520px] items-center justify-center bg-[#171d2d] text-[11px] text-[#94a3b8]">
                Rendering source preview...
              </div>
            ) : null}
            {previewError ? (
              <div className="absolute inset-0 flex min-h-[520px] items-center justify-center bg-[#171d2d] px-6 text-center text-[11px] text-red-300">
                {previewError}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-[#64748b]">
            {sourceStored ? "No source document selected." : "Source file is not stored yet."}
          </div>
        )}
      </div>
    </div>
  );
}

function fieldColorClasses(field: AwbExtractedField) {
  if (field.color === "blue") {
    return {
      border: "border-blue-400/25",
      background: "bg-blue-400/[0.07]",
      text: "text-blue-300",
      dot: "bg-blue-400",
    };
  }
  if (
    field.needsReview ||
    field.status === "review" ||
    field.status === "missing" ||
    field.confidence < 0.85
  ) {
    return {
      border: "border-red-400/25",
      background: "bg-red-400/[0.07]",
      text: "text-red-300",
      dot: "bg-red-400",
    };
  }
  if (field.status === "warning" || field.confidence < 0.95) {
    return {
      border: "border-amber-400/25",
      background: "bg-amber-400/[0.07]",
      text: "text-amber-300",
      dot: "bg-amber-400",
    };
  }
  return {
    border: "border-emerald-400/20",
    background: "bg-emerald-400/[0.06]",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  };
}

function ExtractedFieldsPanel({
  extraction,
  onFieldChange,
  manuallyReviewedKeys,
  readOnly = false,
}: {
  extraction: AwbExtractionResponse;
  onFieldChange: (key: string, value: string) => void;
  manuallyReviewedKeys: Set<string>;
  readOnly?: boolean;
}) {
  type FieldFilter = "all" | "review" | "warning" | "valid" | "reviewed" | "missing";
  const [filter, setFilter] = useState<FieldFilter>("all");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [pinnedFieldKeys, setPinnedFieldKeys] = useState<Set<string>>(() => new Set());
  const fieldTone = (field: AwbExtractedField) => {
    if (
      field.value.trim() &&
      (manuallyReviewedKeys.has(field.key) || field.color === "blue")
    ) {
      return "blue";
    }
    if (
      field.needsReview ||
      field.status === "review" ||
      field.status === "missing" ||
      field.confidence < 0.85
    ) {
      return "red";
    }
    if (field.status === "warning" || field.confidence < 0.95) return "amber";
    return "green";
  };
  const matchesFilter = (field: AwbExtractedField, selectedFilter: FieldFilter) => {
    if (selectedFilter === "review") {
      return fieldTone(field) === "red";
    }
    if (selectedFilter === "warning") {
      return fieldTone(field) === "amber";
    }
    if (selectedFilter === "valid") {
      return fieldTone(field) === "green";
    }
    if (selectedFilter === "reviewed") return fieldTone(field) === "blue";
    if (selectedFilter === "missing") return !field.value.trim();
    return true;
  };
  const filters: Array<{ key: FieldFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "review", label: "Needs Review" },
    { key: "warning", label: "Warnings" },
    { key: "valid", label: "Valid" },
    { key: "reviewed", label: "Manually Reviewed" },
    { key: "missing", label: "Missing" },
  ];
  const visibleFields = extraction.fields.filter(
    (field) =>
      matchesFilter(field, filter) ||
      Object.hasOwn(editingValues, field.key) ||
      pinnedFieldKeys.has(field.key)
  );

  const updateEditingValue = (field: AwbExtractedField, value: string) => {
    setEditingValues((current) => {
      if (value === field.value) {
        if (!Object.hasOwn(current, field.key)) return current;
        const next = { ...current };
        delete next[field.key];
        return next;
      }
      return { ...current, [field.key]: value };
    });
  };

  const cancelEditing = (key: string) => {
    setEditingValues((current) => {
      if (!Object.hasOwn(current, key)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const commitEditing = (field: AwbExtractedField) => {
    if (!Object.hasOwn(editingValues, field.key)) return;
    const value = editingValues[field.key];
    onFieldChange(field.key, value);
    setEditingValues((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });
    setPinnedFieldKeys((current) => {
      const next = new Set(current);
      next.add(field.key);
      return next;
    });
  };

  const selectFilter = (nextFilter: FieldFilter) => {
    setFilter(nextFilter);
    setPinnedFieldKeys(new Set());
  };

  return (
    <div className="awb-extracted-fields-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.03]">
      <div className="flex h-10 shrink-0 items-center border-b border-white/[0.08] px-3">
        <div className="text-[12px] font-extrabold">Extracted Fields</div>
        <span className="ml-2 rounded bg-[#00d4aa]/15 px-2 py-1 font-mono text-[9px] text-[#00d4aa]">
          {extraction.summary.capturedFields}/{extraction.summary.totalFields}
        </span>
        <div className="ml-auto text-[9px] text-[#64748b]">
          Avg. confidence{" "}
          <span className="font-mono font-bold text-[#00d4aa]">
            {extraction.summary.averageConfidencePercent}%
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/[0.08] px-3 py-2">
        {filters.map((item) => {
          const count = extraction.fields.filter((field) => matchesFilter(field, item.key)).length;
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectFilter(item.key)}
              aria-pressed={active}
              className={`h-[24px] rounded-[5px] border px-2 text-[11px] font-medium leading-none transition ${
                active
                  ? "border-[#2f80ff]/55 bg-[#2f80ff]/15 text-[#93c5fd]"
                  : "border-white/[0.08] bg-white/[0.025] text-[#64748b] hover:border-white/15 hover:text-[#cbd5e1]"
              }`}
            >
              {item.label} <span className="font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {visibleFields.map((field) => {
          const colors = fieldColorClasses(field);
          const isDirty = Object.hasOwn(editingValues, field.key);
          const editingValue = isDirty ? editingValues[field.key] : field.value;
          return (
            <article
              key={field.key}
              data-field-key={field.key}
              className={`awb-extracted-field-card rounded-[8px] border px-3 py-2.5 ${colors.border} ${colors.background}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-[10px] font-bold text-[#cbd5e1]">
                      {field.label}
                    </h3>
                    <span className={`shrink-0 font-mono text-[9px] font-bold ${colors.text}`}>
                      {field.confidencePercent}%
                    </span>
                  </div>
                  <textarea
                    value={editingValue}
                    onChange={(event) => updateEditingValue(field, event.target.value)}
                    disabled={readOnly}
                    rows={Math.min(6, Math.max(1, editingValue.split("\n").length))}
                    aria-label={field.label}
                    className="awb-extracted-field-input mt-1 w-full resize-y overflow-hidden rounded-[6px] border border-white/[0.08] bg-black/10 px-2 py-1.5 text-[13px] font-normal leading-5 text-white outline-none placeholder:text-[#64748b] focus:border-[#2f80ff]/70 focus:bg-black/15 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Missing value"
                  />
                  {isDirty && !readOnly ? (
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => cancelEditing(field.key)}
                        className="h-7 rounded-[6px] border border-white/10 bg-white/[0.035] px-2.5 text-[9px] font-bold text-[#94a3b8] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => commitEditing(field)}
                        className="h-7 rounded-[6px] bg-[#2f80ff] px-3 text-[9px] font-bold text-white transition hover:bg-[#428cff]"
                      >
                        Done
                      </button>
                    </div>
                  ) : null}
                  {manuallyReviewedKeys.has(field.key) ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-blue-300">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>Manually reviewed</span>
                    </div>
                  ) : field.comment ? (
                    <div className={`mt-1.5 flex items-start gap-1.5 text-[9px] leading-[1.4] ${colors.text}`}>
                      {field.status === "valid" ? (
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                      )}
                      <span>{field.comment}</span>
                    </div>
                  ) : field.status !== "valid" ? (
                    <div className={`mt-1.5 text-[9px] ${colors.text}`}>
                      {field.status === "warning" ? "Low confidence - verify this value." : "Review required."}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {!visibleFields.length ? (
          <div className="flex min-h-24 items-center justify-center rounded-[8px] border border-dashed border-white/10 text-[10px] text-[#64748b]">
            No fields match this filter.
          </div>
        ) : null}
      </div>

      <div className="flex h-12 shrink-0 items-center border-t border-white/[0.08] px-3 font-mono text-[9px]">
        <span className="font-bold text-emerald-300">{extraction.summary.validFields} valid</span>
        <span className="ml-4 font-bold text-amber-300">{extraction.summary.warningFields} warning</span>
        <span className="ml-4 font-bold text-red-300">
          {extraction.summary.needsReview - extraction.summary.warningFields} review
        </span>
      </div>
    </div>
  );
}

function ReviewView({
  fileName,
  pdfUrl,
  extraction,
  onExtractionChange,
  onNewDocument,
  canEdit,
  sourceStored,
}: {
  fileName: string;
  pdfUrl: string | null;
  extraction: AwbExtractionResponse;
  onExtractionChange: (next: AwbExtractionResponse) => void;
  onNewDocument: (hasUnsavedChanges: boolean) => void;
  canEdit: boolean;
  sourceStored: boolean;
}) {
  const [reviewView, setReviewView] = useState<"form" | "fields">("form");
  const [savingDraft, setSavingDraft] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [manuallyReviewedKeys, setManuallyReviewedKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const formData = awbPayloadFromExtraction(extraction);
  const processTime = extraction.meta.totalSeconds
    ? `${extraction.meta.totalSeconds.toFixed(1)}s`
    : `${(extraction.document.processingTimeMs / 1000).toFixed(1)}s`;
  const isIssued = extraction.document.status === "issued";

  const updateFieldValue = (key: string, value: string) => {
    if (!canEdit) return;
    const fields = extraction.fields.map((field) => {
      if (field.key !== key) return field;
      const normalizedValue = value;
      return {
        ...field,
        value: normalizedValue,
        needsReview: !normalizedValue.trim(),
        status: normalizedValue.trim() ? ("valid" as const) : ("missing" as const),
        color: normalizedValue.trim() ? ("blue" as const) : ("red" as const),
        comment: normalizedValue.trim() ? "Manually reviewed" : field.comment,
      };
    });
    onExtractionChange({
      ...extraction,
      fields,
      summary: summarizeReviewFields(fields),
    });
    setManuallyReviewedKeys((current) => {
      const next = new Set(current);
      if (value.trim()) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
    setIsDirty(true);
    setActionNotice(null);
  };

  const saveDraft = async (): Promise<boolean> => {
    setSavingDraft(true);
    setActionNotice(null);
    try {
      const response = await fetch(`/api/awb/documents/${extraction.document.id}/draft`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: extraction.fields.map((field) => ({ key: field.key, value: field.value })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setActionNotice({
          type: "error",
          message: responseMessage(payload, "Unable to save the AWB draft."),
        });
        return false;
      }
      onExtractionChange({
        ...extraction,
        document: { ...extraction.document, status: "draft" },
      });
      setIsDirty(false);
      setActionNotice({ type: "success", message: payload?.message || "Draft saved." });
      return true;
    } catch {
      setActionNotice({ type: "error", message: "Unable to save the AWB draft." });
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  const focusFirstInvalidField = (fieldKey: string | undefined) => {
    if (!fieldKey) return;
    window.setTimeout(() => {
      const field = document.querySelector<HTMLElement>(`[data-field-key="${fieldKey}"]`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }, 0);
  };

  const downloadFinalPdf = async () => {
    const response = await fetch("https://semloxai.vercel.app/api/generate-awb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPdfPayloadFromExtraction(extraction)),
    });
    if (!response.ok) throw new Error("Final PDF generation failed");

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const awbNumber =
      extraction.fields.find((field) => field.key === "awb_number")?.value || "document";
    const safeAwbNumber = awbNumber.replace(/[^a-z0-9_-]+/gi, "_");
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `AWB_${safeAwbNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  const issueAwb = async () => {
    const validation = validateReviewForIssue(extraction.fields);
    if (validation.invalidKeys.length) {
      setActionNotice({
        type: "error",
        message: "Please fill all required fields before issuing.",
      });
      focusFirstInvalidField(validation.invalidKeys[0]);
      return;
    }
    setConfirmIssueOpen(true);
  };

  const confirmIssue = async () => {
    setConfirmIssueOpen(false);
    setIssuing(true);
    setActionNotice(null);
    try {
      const response = await fetch(`/api/awb/documents/${extraction.document.id}/issue`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: extraction.fields.map((field) => ({ key: field.key, value: field.value })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        setActionNotice({
          type: "error",
          message: responseMessage(payload, "Unable to issue the AWB."),
        });
        const invalidFields = Array.isArray(payload?.fields) ? payload.fields : [];
        const firstInvalidKey =
          invalidFields[0] && typeof invalidFields[0].key === "string"
            ? invalidFields[0].key
            : undefined;
        focusFirstInvalidField(firstInvalidKey);
        return;
      }

      onExtractionChange({
        ...extraction,
        document: { ...extraction.document, status: "issued" },
      });
      setIsDirty(false);
      setActionNotice({ type: "success", message: "AWB issued successfully." });
      try {
        await downloadFinalPdf();
      } catch {
        setActionNotice({
          type: "error",
          message: "AWB issued successfully. Final PDF generation could not be completed.",
        });
      }
    } catch {
      setActionNotice({ type: "error", message: "Unable to issue the AWB." });
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="awb-review-page h-full overflow-y-auto overflow-x-hidden bg-[#050813] text-white">
      <section className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-5 py-4">
        {extraction.mode === "fallback" ? (
          <div className="rounded-[8px] border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-[10px] font-medium text-amber-200">
            {extraction.message ||
              "Live extraction unavailable. Mock extraction was used."}
          </div>
        ) : null}
        <div className="awb-review-heading flex flex-wrap items-center justify-between gap-3">
          <div className="awb-review-summary flex min-h-[60px] min-w-[min(100%,640px)] flex-1 flex-wrap items-center gap-3 rounded-[9px] border border-[#00d4aa]/30 bg-[#00d4aa]/[0.07] px-4 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00d4aa]/20 text-[#00d4aa]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[12px] font-extrabold">
                Extraction completed in {processTime}
              </div>
            </div>
            <div className="ml-auto grid min-w-[380px] grid-cols-4 gap-5 text-center font-mono max-md:ml-0 max-md:min-w-0 max-md:w-full max-sm:grid-cols-2">
              {[
                [`${extraction.summary.capturedFields} / ${extraction.summary.totalFields}`, "FIELDS"],
                [String(extraction.summary.needsReview), "REVIEW"],
                [`${extraction.summary.averageConfidencePercent}%`, "CONFIDENCE"],
                [processTime, "PROCESS TIME"],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className={`text-[13px] font-extrabold ${label === "REVIEW" ? "text-[#f59e0b]" : "text-[#00d4aa]"}`}>
                    {value}
                  </div>
                  <div className="mt-0.5 text-[8px] text-[#64748b]">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="awb-review-actions flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onNewDocument(isDirty)}
              disabled={savingDraft || issuing}
              className="inline-flex h-9 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.035] px-4 text-[11px] font-semibold text-[#94a3b8] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f80ff]/50"
            >
              New Document
            </button>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={!canEdit || savingDraft || issuing}
              className="inline-flex h-9 items-center justify-center rounded-[7px] border border-white/10 bg-white/[0.035] px-4 text-[11px] font-semibold text-[#94a3b8] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2f80ff]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => void issueAwb()}
              disabled={!canEdit || savingDraft || issuing || isIssued}
              className="inline-flex h-9 items-center justify-center rounded-[7px] bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] px-4 text-[11px] font-bold text-white shadow-[0_8px_22px_rgba(47,128,255,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {issuing ? "Issuing..." : isIssued ? "Issued" : "Issue AWB"}
            </button>
          </div>
        </div>

        {actionNotice ? (
          <div
            className={`rounded-[8px] border px-3 py-2 text-[11px] font-semibold ${
              actionNotice.type === "success"
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/25 bg-red-400/10 text-red-300"
            }`}
          >
            {actionNotice.message}
          </div>
        ) : null}

        <div className="awb-review-stepper flex min-h-[44px] items-center overflow-x-auto rounded-[9px] border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[11px] font-bold">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#20c997] text-[10px]">✓</span>
            Upload
          </div>
          <div className="mx-4 h-px flex-1 bg-[#20c997]" />
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#20c997] text-[10px]">✓</span>
            AI Extract
          </div>
          <div className={`mx-4 h-px flex-1 ${isIssued ? "bg-[#20c997]" : "bg-[#2f80ff]"}`} />
          <div className="flex items-center gap-2 text-white">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] ${
              isIssued
                ? "bg-[#20c997] text-white"
                : "bg-[#2f80ff] text-white shadow-[0_0_0_4px_rgba(47,128,255,0.18)]"
            }`}>
              {isIssued ? <CheckCircle2 className="h-3 w-3" /> : "03"}
            </span>
            Review Fields
          </div>
          <div className={`mx-4 h-px flex-1 ${isIssued ? "bg-[#20c997]" : "bg-white/[0.08]"}`} />
          <div className={`flex items-center gap-2 ${isIssued ? "awb-step-issued text-white" : "text-[#64748b]"}`}>
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] ${
              isIssued
                ? "bg-[#20c997] text-white shadow-[0_0_0_4px_rgba(32,201,151,0.18)]"
                : "border border-white/10 text-[#64748b]"
            }`}>
              {isIssued ? <CheckCircle2 className="h-3 w-3" /> : "04"}
            </span>
            Issue / Export
          </div>
        </div>

        <div className="hidden">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#00d4aa]/20 text-[#00d4aa]">✓</div>
          <div>
            <div className="text-[12px] font-extrabold">
              Extraction completed in {processTime}
            </div>
          </div>
          <div className="ml-auto grid min-w-[390px] grid-cols-4 gap-5 text-center font-mono max-md:ml-0 max-md:min-w-0 max-md:w-full max-sm:grid-cols-2">
            {[
              [`${extraction.summary.capturedFields} / ${extraction.summary.totalFields}`, "FIELDS"],
              [String(extraction.summary.needsReview), "REVIEW"],
              [`${extraction.summary.averageConfidencePercent}%`, "CONFIDENCE"],
              [processTime, "PROCESS TIME"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className={`text-[12px] font-extrabold ${label === "REVIEW" ? "text-[#f59e0b]" : "text-[#00d4aa]"}`}>
                  {value}
                </div>
                <div className="mt-1 text-[7px] text-[#64748b]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="awb-review-workspace grid min-w-0 grid-cols-1 items-start gap-4 min-[1024px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1280px]:grid-cols-2">
          <div className="awb-review-left-column flex h-[clamp(720px,calc(100vh-210px),1050px)] min-h-0 min-w-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.02]">
            <div className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2">
              <div>
                <div className="text-[12px] font-extrabold text-white">Review Workspace</div>
              </div>
              <div
                role="tablist"
                aria-label="AWB review view"
                className="inline-flex max-w-full shrink-0 rounded-[7px] border border-white/[0.08] bg-black/20 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={reviewView === "form"}
                  onClick={() => setReviewView("form")}
                  className={`h-7 rounded-[5px] px-3 text-[10px] font-bold transition max-sm:px-2 ${
                    reviewView === "form"
                      ? "bg-[#2f80ff] text-white shadow-sm"
                      : "text-[#64748b] hover:bg-white/[0.05] hover:text-[#cbd5e1]"
                  }`}
                >
                  AWB Form
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reviewView === "fields"}
                  onClick={() => setReviewView("fields")}
                  className={`h-7 rounded-[5px] px-3 text-[10px] font-bold transition max-sm:px-2 ${
                    reviewView === "fields"
                      ? "bg-[#2f80ff] text-white shadow-sm"
                      : "text-[#64748b] hover:bg-white/[0.05] hover:text-[#cbd5e1]"
                  }`}
                >
                  Extracted Fields
                </button>
              </div>
            </div>

            <div
              role="tabpanel"
              hidden={reviewView !== "fields"}
              className="min-h-0 flex-1 p-2"
            >
              <ExtractedFieldsPanel
                extraction={extraction}
                onFieldChange={updateFieldValue}
                manuallyReviewedKeys={manuallyReviewedKeys}
                readOnly={!canEdit}
              />
            </div>

            <div
              role="tabpanel"
              hidden={reviewView !== "form"}
              className="min-h-0 flex-1 p-2"
            >
              <AwbDocumentPreview
                fileName={fileName}
                data={formData}
                pages={extraction.document.pages}
                onSaveDraft={() => void saveDraft()}
                onExportFinalPdf={() => void issueAwb()}
                onPaperFieldChange={(payloadKey, value) => {
                  const fieldKey = PAPER_PAYLOAD_TO_FIELD_KEY[payloadKey];
                  if (fieldKey) updateFieldValue(fieldKey, value);
                }}
                savingDraft={savingDraft}
                exportingPdf={issuing}
                readOnly={!canEdit}
              />
            </div>
          </div>

          <div className="awb-review-source-column h-[clamp(720px,calc(100vh-210px),1050px)] min-h-0 min-w-0">
            <UploadedPdfPanel fileName={fileName} pdfUrl={pdfUrl} sourceStored={sourceStored} />
          </div>
        </div>
      </section>
      {confirmIssueOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-awb-review-title"
            className="awb-confirm-issue-modal w-full max-w-[430px] rounded-[10px] border border-white/10 bg-[#0b111e] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            <h2 id="confirm-awb-review-title" className="awb-confirm-issue-title text-[16px] font-extrabold text-white">
              Confirm AWB Review
            </h2>
            <p className="awb-confirm-issue-body mt-2 text-[12px] leading-5 text-[#94a3b8]">
              Confirm that all required fields have been reviewed before issuing this AWB.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmIssueOpen(false)}
                className="awb-confirm-issue-cancel h-9 rounded-[7px] border border-white/10 bg-white/[0.04] px-4 text-[11px] font-semibold text-[#cbd5e1] hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmIssue()}
                className="awb-confirm-issue-primary h-9 rounded-[7px] bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] px-4 text-[11px] font-bold text-white"
              >
                Yes, Issue AWB
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <style jsx global>{`
        .dashboard-theme-light .awb-review-page {
          background-color: #f4f7fb !important;
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-summary {
          background-color: #f0fdf8 !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
          color: #111827 !important;
          box-shadow: none !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper,
        .dashboard-theme-light .awb-review-page .awb-review-left-column,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
          color: #111827 !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper > div {
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper > div:last-child {
          color: #64748b !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper span {
          color: #334155 !important;
          border-color: #cbd5e1 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper span[class*="bg-[#20c997]"],
        .dashboard-theme-light .awb-review-page .awb-review-stepper span[class*="bg-[#2f80ff]"] {
          color: #ffffff !important;
          border-color: transparent !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-stepper > div.awb-step-issued {
          color: #047857 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-modal {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
          color: #111827 !important;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18) !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-title {
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-body {
          color: #64748b !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-cancel {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-cancel:hover {
          background-color: #f8fafc !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .awb-review-page .awb-confirm-issue-primary {
          color: #ffffff !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-actions button:not(:last-child) {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-actions button:not(:last-child):hover {
          background-color: #f8fafc !important;
          border-color: #93b8ee !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .awb-review-page h1,
        .dashboard-theme-light .awb-review-page .awb-preview-toolbar span,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel > div:first-child {
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page p,
        .dashboard-theme-light .awb-review-page section [class*="text-[#64748b]"] {
          color: #475569 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-document-preview,
        .dashboard-theme-light .awb-review-page .awb-extracted-fields-panel {
          background-color: transparent !important;
          border-color: transparent !important;
          color: #111827 !important;
          box-shadow: none !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-left-column > div:first-child,
        .dashboard-theme-light .awb-review-page .awb-preview-toolbar,
        .dashboard-theme-light .awb-review-page .awb-preview-review-summary,
        .dashboard-theme-light .awb-review-page .awb-preview-actions,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel > div:first-child {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-review-left-column [role="tablist"] {
          background-color: #f8fafc !important;
          border-color: #d5deea !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-extracted {
          background-color: #dffaf0 !important;
          border-color: #5ee6bb !important;
          color: #047857 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-extracted strong {
          color: #065f46 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-extracted span {
          background-color: #10b981 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-review {
          background-color: #fff3d6 !important;
          border-color: #f4c75f !important;
          color: #92400e !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-review strong {
          color: #78350f !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-review span {
          background-color: #f59e0b !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-empty {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #475569 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-empty strong {
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-empty span {
          background-color: #64748b !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-confidence {
          background-color: #e8f1ff !important;
          border-color: #93b8ee !important;
          color: #1d4ed8 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-status-chip-confidence strong {
          color: #1e3a8a !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-toolbar span:first-of-type,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel > div:first-child > div {
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-toolbar span:not(:first-of-type),
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel > div:first-child > span {
          color: #64748b !important;
        }

        .dashboard-theme-light .awb-review-page .awb-document-scroll,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel > div:last-child {
          background-color: #f8fafc !important;
        }

        .dashboard-theme-light .awb-review-page .awb-document-scroll .awb-form {
          color: #111827 !important;
        }

        .awb-review-page .awb-extracted-fields-panel .awb-extracted-field-input {
          font-size: 13px !important;
          font-weight: 400 !important;
          line-height: 20px !important;
          padding: 5px 8px !important;
        }

        .dashboard-theme-light .awb-review-page .awb-extracted-fields-panel > div,
        .dashboard-theme-light .awb-review-page .awb-document-preview > div {
          border-color: #d5deea !important;
        }

        .dashboard-theme-light .awb-review-page .awb-extracted-fields-panel h3,
        .dashboard-theme-light .awb-review-page .awb-extracted-fields-panel [class*="text-[#cbd5e1]"] {
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-extracted-field-card {
          background-color: #ffffff !important;
          border-color: #d5deea !important;
          box-shadow: none !important;
        }

        .dashboard-theme-light .awb-review-page .awb-extracted-field-input {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #111827 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-extracted-field-input:focus {
          background-color: #ffffff !important;
          border-color: rgba(47, 128, 255, 0.7) !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-toolbar button,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel button,
        .dashboard-theme-light .awb-review-page [role="tab"] {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-toolbar button:hover,
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel button:hover,
        .dashboard-theme-light .awb-review-page [role="tab"]:hover {
          background-color: #edf4ff !important;
          border-color: #93b8ee !important;
          color: #0f172a !important;
        }

        .dashboard-theme-light .awb-review-page [role="tab"][aria-selected="true"] {
          background-color: #2f80ff !important;
          border-color: #2f80ff !important;
          color: #ffffff !important;
        }

        .dashboard-theme-light .awb-review-page .awb-preview-toolbar button[class*="bg-[#2f80ff]"],
        .dashboard-theme-light .awb-review-page .awb-uploaded-pdf-panel button[aria-pressed="true"] {
          background-color: #e6f0ff !important;
          border-color: rgba(47, 128, 255, 0.45) !important;
          color: #2f80ff !important;
        }

        @media (max-width: 1279px) {
          .awb-review-left-column,
          .awb-review-source-column {
            height: 720px;
            min-height: 560px;
          }
        }

        @media (max-width: 767px) {
          .awb-review-summary > div:nth-child(2) {
            min-width: 0;
            flex: 1;
          }

          .awb-review-left-column,
          .awb-review-source-column {
            height: 620px;
            min-height: 520px;
          }
        }
      `}</style>
    </div>
  );
}


function AwbProcessingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDocumentId = searchParams.get("documentId");
  const [allowed, setAllowed] = useState(false);
  const [phase, setPhase] = useState<AwbPhase>("upload");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<AwbExtractionResponse | null>(null);
  const [extractionError, setExtractionError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [savedDocumentLoading, setSavedDocumentLoading] = useState(
    Boolean(requestedDocumentId)
  );
  const [savedDocumentError, setSavedDocumentError] = useState("");
  const [documentCanEdit, setDocumentCanEdit] = useState(true);
  const [sourceStored, setSourceStored] = useState(true);

  const selectedFileName =
    selectedFile?.name ?? extraction?.document.fileName ?? "Selected AWB";

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const runExtraction = async (file: File) => {
    setExtractionError("");
    setExtraction(null);
    setPhase("processing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCompanyId) formData.append("companyId", selectedCompanyId);
      const response = await fetch("/api/awb/extract", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false || !payload?.data) {
        setExtractionError(responseMessage(payload, "AWB extraction failed. Please try again."));
        return;
      }
      setExtraction(payload.data as AwbExtractionResponse);
      setDocumentCanEdit(true);
      setSourceStored(true);
      setPhase("review");
    } catch {
      setExtractionError("AWB extraction failed. Please try again.");
    }
  };

  const processSelectedFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateAwbFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    setPdfUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });
    void runExtraction(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    processSelectedFile(event.dataTransfer.files?.[0]);
  };

  const { selectedCompanyId, setSelectedCompanyId } = useCompany();

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] checking memberships");
      const res = await fetchMemberships();
      if (!mounted) return;

      if (!res.ok) {
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", res.status);
        if (res.status === 401 || res.status === 403) {
          if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] redirect reason: unauthorized");
          router.replace("/login");
          return;
        }
        setAllowed(true);
        return;
      }

      const memberships = res.memberships || [];
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", 200, memberships.length);

      if (!selectedCompanyId && memberships.length === 1) {
        const cid = memberships[0].company_id;
        setSelectedCompanyId(cid, true);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] selectedCompanyId", cid);
      }

      setAllowed(true);
    }

    checkSession();
    window.addEventListener("pageshow", checkSession);
    return () => {
      mounted = false;
      window.removeEventListener("pageshow", checkSession);
    };
  }, [router, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    if (!allowed || !requestedDocumentId) return;
    let mounted = true;
    void fetch(`/api/awb/documents/${encodeURIComponent(requestedDocumentId)}`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false || !payload?.data) {
          throw new Error(responseMessage(payload, "Unable to load the AWB document."));
        }
        if (!mounted) return;
        const loaded = payload.data as AwbExtractionResponse & {
          history?: { canEdit?: boolean; storagePath?: string | null };
        };
        setSelectedFile(null);
        setPdfUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return null;
        });
        setExtraction(loaded);
        setDocumentCanEdit(Boolean(loaded.history?.canEdit));
        setSourceStored(Boolean(loaded.history?.storagePath));
        setPhase("review");
      })
      .catch((loadError) => {
        if (!mounted) return;
        setSavedDocumentError(
          loadError instanceof Error ? loadError.message : "Unable to load the AWB document."
        );
      })
      .finally(() => {
        if (mounted) setSavedDocumentLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [allowed, requestedDocumentId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070B17]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
      </main>
    );
  }

  if (savedDocumentLoading) {
    return (
      <main className="flex h-full items-center justify-center bg-[#070B17]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
      </main>
    );
  }

  if (requestedDocumentId && savedDocumentError) {
    return (
      <main className="flex h-full items-center justify-center bg-[#070B17] px-4 text-center">
        <div>
          <div className="text-[13px] font-semibold text-red-300">{savedDocumentError}</div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/history")}
            className="mt-4 rounded-[7px] bg-[#2f80ff] px-4 py-2 text-[11px] font-bold text-white"
          >
            Back to History
          </button>
        </div>
      </main>
    );
  }

  if (phase === "processing") {
    return (
      <ProcessingView
        fileName={selectedFileName}
        error={extractionError}
        onRetry={() => {
          if (selectedFile) void runExtraction(selectedFile);
        }}
        onChooseAnother={() => {
          setExtractionError("");
          setSelectedFile(null);
          setPhase("upload");
        }}
      />
    );
  }

  if (phase === "review" && extraction) {
    return (
      <ReviewView
        fileName={selectedFileName}
        pdfUrl={pdfUrl}
        extraction={extraction}
        onExtractionChange={setExtraction}
        canEdit={documentCanEdit}
        sourceStored={sourceStored}
        onNewDocument={(hasUnsavedChanges) => {
          if (
            hasUnsavedChanges &&
            !window.confirm("You have unsaved changes. Start a new document?")
          ) {
            return;
          }
          setPdfUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return null;
          });
          setSelectedFile(null);
          setExtraction(null);
          setExtractionError("");
          setUploadError("");
          setDocumentCanEdit(true);
          setSourceStored(true);
          setPhase("upload");
          router.replace("/dashboard/awb");
        }}
      />
    );
  }

  return (
    <div className="awb-upload-page h-full overflow-hidden bg-[#04060f]">
               <input
                 ref={fileInputRef}
                 type="file"
                 accept="application/pdf,image/jpeg,image/png,image/tiff,.pdf,.jpg,.jpeg,.png,.tif,.tiff"
                 className="hidden"
                 onChange={handleFileChange}
               />
               {/* PAGE CONTENT */}
<div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-5 py-4">

  {/* STEPS */}
  <div className="awb-stepper flex shrink-0 items-center overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">

    {/* STEP 1 */}
    <div className="awb-step-active flex shrink-0 items-center gap-2 py-1 text-xs font-semibold text-white">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#3b82f6] bg-[#3b82f6] text-[11px] font-bold text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)]">
        01
      </div>

      <span>Upload</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 2 */}
    <div className="awb-step-muted flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        02
      </div>

      <span>AI Extract</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 3 */}
    <div className="awb-step-muted flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        03
      </div>

      <span>Review Fields</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 4 */}
    <div className="awb-step-muted flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        04
      </div>

      <span>Issue / Export</span>
    </div>
  </div>

  {/* MAIN GRID */}
  <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3.5 overflow-hidden">

    {/* LEFT PANEL */}
    <div className="awb-upload-card flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.03]">

      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#1a1f2e]">

        <div onClick={openFilePicker} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="flex h-[340px] w-4/5 max-w-[520px] cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-[#3b82f6]/40 bg-[#3b82f6]/[0.05] transition-all duration-200 hover:scale-[1.005] hover:border-[#3b82f6] hover:bg-[#3b82f6]/[0.08]">

          {/* ICON */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/15 to-[#06b6d4]/15 text-[#3b82f6]">
            <svg
  width="28"
  height="28"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
</svg>
          </div>

          {/* TEXT */}
          <div>
            <div className="text-center text-lg font-bold tracking-[-0.02em] text-white">
              Drop AWB here
            </div>

            <div className="mt-1 max-w-[340px] text-center text-[13px] text-[#94a3b8]">
              Drag & drop your PDF, or click to browse
            </div>
          </div>

          {/* BUTTON */}
          <button onClick={(event) => { event.stopPropagation(); openFilePicker(); }} className="primary-blue-action rounded-full bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] px-6 py-2.5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(47,128,255,0.24)] transition hover:brightness-110 hover:shadow-md">
            Browse Files
          </button>

          {/* FILE TYPES */}
          <div className="flex flex-wrap justify-center gap-1.5">

            {[".PDF", ".JPG", ".PNG", ".TIFF"].map((item) => (
              <span
                key={item}
                className="rounded border border-white/[0.08] bg-white/[0.05] px-2 py-1 font-mono text-[10px] text-[#94a3b8]"
              >
                {item}
              </span>
            ))}

            <span className="rounded border border-[#3b82f6]/30 bg-white/[0.05] px-2 py-1 font-mono text-[10px] text-[#3b82f6]">
              Max 25 MB
            </span>
          </div>
          {uploadError ? (
            <div className="max-w-[360px] rounded-[7px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-center text-[10px] font-semibold text-red-300">
              {uploadError}
            </div>
          ) : null}
        </div>
      </div>
    </div>

    {/* RIGHT PANEL */}
    <div className="awb-awaiting-panel flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.03]">

      {/* HEADER */}
      <div className="awb-awaiting-header flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span className="awb-awaiting-title text-[13px] font-semibold text-white">
          Awaiting Document
        </span>
      </div>

      {/* BODY */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-10 text-center">

        <div>

          {/* ICON */}
          <div className="mx-auto mb-3.5 flex h-[60px] w-[60px] items-center justify-center rounded-[14px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.08] text-[#3b82f6]">
            <svg
  width="28"
  height="28"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
</svg>
          </div>

          {/* TITLE */}
          <div className="awb-ready-title mb-1 text-sm font-bold text-white">
            20 fields ready to extract
          </div>

          {/* SUBTITLE */}
          <div className="awb-ready-subtitle mb-[18px] text-[11px] leading-[1.6] text-[#64748b]">
            Standard AWB fields
          </div>

          {/* FIELD GRID */}
          <div className="awb-field-grid grid grid-cols-2 gap-1.5 text-left text-[10px] text-[#cbd5e1]">

            {[
              "AWB Number",
              "Shipper Name",
              "Shipper Account #",
              "Shipper Address",
              "Consignee",
              "Consignee Account #",
              "Consignee Address",
              "Origin Airport",
              "Destination Airport",
              "Flight Number",
              "Flight Date",
              "Issuing Carrier",
            ].map((field) => (
              <div
                key={field}
                className="awb-field-pill flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5"
              >
                <div className="h-[5px] w-[5px] rounded-full bg-[#3b82f6]" />

                {field}
              </div>
            ))}

            <div className="col-span-2 mt-1 text-center text-[10px] text-[#64748b]">
              + 8 more fields
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<style jsx global>{`
  .dashboard-theme-light .awb-upload-page {
    background-color: #f3f4f6 !important;
    color: #0f172a;
  }

  .dashboard-theme-light .awb-upload-page .awb-stepper {
    background-color: #f8fafc !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .dashboard-theme-light .awb-upload-page .awb-step-active {
    color: #0f172a !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-step-muted {
    color: #475569 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-stepper > div[class*="h-px"] {
    background-color: #dbe3ef !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card {
    background-color: #f8fafc !important;
    border-color: #cbd5e1 !important;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card > div {
    background-color: #f8fafc !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card [class*="border-dashed"] {
    background-color: #eff6ff !important;
    border-color: rgba(47, 128, 255, 0.55) !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card [class*="text-white"] {
    color: #0f172a !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card .primary-blue-action {
    color: #ffffff !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card [class*="text-[#94a3b8]"],
  .dashboard-theme-light .awb-upload-page .awb-upload-card [class*="text-[#64748b]"] {
    color: #475569 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-upload-card [class*="bg-white/[0.05]"] {
    background-color: #ffffff !important;
    border-color: #cbd5e1 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-awaiting-panel {
    background-color: #f8fafc !important;
    border-color: #cbd5e1 !important;
    color: #0f172a !important;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  }

  .dashboard-theme-light .awb-upload-page .awb-awaiting-header {
    background-color: #f8fafc !important;
    border-color: #d9e0ea !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-awaiting-title,
  .dashboard-theme-light .awb-upload-page .awb-ready-title {
    color: #0f172a !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-ready-subtitle {
    color: #475569 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-field-grid {
    color: #334155 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-field-pill {
    background-color: #ffffff !important;
    border-color: #cbd5e1 !important;
    color: #334155 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-field-pill:hover {
    border-color: #93c5fd !important;
    background-color: #eff6ff !important;
  }
`}</style>
    </div>
  );
}

export default function AwbProcessingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-full items-center justify-center bg-[#070B17]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
        </main>
      }
    >
      <AwbProcessingPageContent />
    </Suspense>
  );
}
