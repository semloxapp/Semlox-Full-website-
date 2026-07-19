"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { awbHistoryQueryKeys } from "../../hooks/queries/useAwbHistory";
import { dashboardQueryKeys } from "../../hooks/queries/useDashboardData";
import { membershipErrorStatus, useMemberships } from "../../hooks/queries/useMemberships";
import { useActiveReviewTimer } from "../../hooks/useActiveReviewTimer";
import { awbTimingClientFlags } from "@/lib/features/awbTimingFlags.client";
import { AwbTimingDebugPanel } from "./components/AwbTimingDebugPanel";
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
  Save,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import type { AwbExtractedField, AwbExtractionResponse } from "@/lib/awb/types";
import { REQUIRED_AWB_FIELD_KEYS } from "@/lib/awb/fieldRegistry";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import AwbPaperContent, {
  getAwbReviewPresentationStats,
  ModernAwbPaper,
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
function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as Record<string, unknown>).message;
  return typeof message === "string" && message ? message : fallback;
}

function revokeLocalObjectUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
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
    awb_number: values.awb_number,
    reference_number: values.reference_number,
    shipper_address: values.shipper_name_address,
    consignee_address: values.consignee_name_address,
    issued_by: values.issuing_carrier,
    executed_on_date: values.executed_on_date,
    pieces_value: values.pieces,
    pieces_line: values.pieces_line,
    gross_weight: values.gross_weight,
    weight_line: values.weight_line,
    chargeable_weight: values.chargeable_weight,
    weight_unit: values.weight_unit,
    handling_info: values.handling_information,
    goods_description: values.nature_and_quantity_of_goods,
    dimensions_or_volume: values.goods_dimensions_or_volume,
  };
}

function validateReviewForIssue(fields: AwbExtractedField[]) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const invalidKeys = REQUIRED_AWB_FIELD_KEYS.filter((key) => {
    const field = byKey.get(key);
    return Boolean(field && !field.value.trim());
  });
  const unmappedKeys = REQUIRED_AWB_FIELD_KEYS.filter((key) => !byKey.has(key));
  return { invalidKeys, unmappedKeys };
}

const PAPER_PAYLOAD_TO_FIELD_KEY: Record<string, string> = {
  awb_number: "awb_number",
  reference_number: "reference_number",
  shipper_address: "shipper_name_address",
  consignee_address: "consignee_name_address",
  airport_departure: "origin_airport",
  airport_destination: "destination_airport",
  issued_by: "issuing_carrier",
  executed_on_date: "executed_on_date",
  pieces_value: "pieces",
  pieces_line: "pieces_line",
  gross_weight: "gross_weight",
  weight_line: "weight_line",
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
    <div className="awb-processing-view flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-[radial-gradient(circle_at_35%_35%,rgba(59,130,246,0.08),transparent_32%),linear-gradient(90deg,#20242d_0%,#20242d_42%,#070b17_52%,#050813_100%)] px-5">
      <div className="awb-processing-stepper flex w-full max-w-[560px] items-center rounded-[9px] border border-white/[0.08] bg-[#070b17]/80 px-4 py-3 text-[10px] font-bold text-white">
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
        <div className="awb-processing-muted-line mx-3 h-px flex-1 bg-white/[0.10]" />
        <div className="awb-processing-muted-step flex items-center gap-2 text-[#64748b]">
          <span className="awb-processing-muted-badge flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/10">
            03
          </span>
          Review Fields
        </div>
      </div>
      <div className="awb-processing-card relative flex min-h-[220px] w-full max-w-[340px] flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.035] px-[26px] py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {error ? (
          <CircleAlert className="mb-4 h-[46px] w-[46px] text-red-400" />
        ) : (
          <div className="awb-processing-spinner mb-[18px] h-[46px] w-[46px] animate-spin rounded-full border-2 border-[#334155] border-t-[#2f80ff]" />
        )}

        <h2 className="awb-processing-title text-[13px] font-extrabold leading-none text-[#f8fafc]">
          {error ? "Extraction could not be completed" : `Processing ${fileName}`}
        </h2>

        <p className="awb-processing-subtitle mt-2 max-w-[250px] text-[9px] leading-[1.4] text-[#64748b]">
          {error || "Extracting AWB fields..."}
        </p>

        {error ? (
          <div className="mt-5 flex w-full gap-2">
            <button type="button" onClick={onChooseAnother} className="awb-processing-secondary-action flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-[7px] border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold leading-none text-[#94a3b8]">
              Choose another
            </button>
            <button type="button" onClick={onRetry} className="flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-[7px] bg-[#2f80ff] px-3 text-[11px] font-bold leading-none text-white">
              Retry extraction
            </button>
          </div>
        ) : (
          <>
            <div className="awb-processing-track mt-[13px] h-[2px] w-full overflow-hidden bg-[#1e293b]">
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
  data,
  onSaveDraft,
  onExportFinalPdf,
  onPaperFieldChange,
  onPaperFieldConfirm,
  savingDraft,
  exportingPdf,
  readOnly,
  magnifierActive,
}: {
  data: Record<string, unknown>;
  onSaveDraft: () => void;
  onExportFinalPdf: () => void;
  onPaperFieldChange: (payloadKey: string, value: string) => void;
  onPaperFieldConfirm: (payloadKey: string) => void;
  savingDraft: boolean;
  exportingPdf: boolean;
  readOnly: boolean;
  magnifierActive: boolean;
}) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [magnifierLensVisible, setMagnifierLensVisible] = useState(false);
  const [lensPosition, setLensPosition] = useState({
    left: 0, top: 0, contentX: 0, contentY: 0, paperWidth: 0,
  });

  // After data loads, auto-resize textareas for browsers without field-sizing: content support
  useEffect(() => {
    const id = setTimeout(() => {
      viewerRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea").forEach((ta) => {
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      });
    }, 80);
    return () => clearTimeout(id);
  }, [data]);

  const moveLens = (event: PointerEvent<HTMLDivElement>) => {
    if (!magnifierActive || !paperRef.current) return;
    const paperRect = paperRef.current.getBoundingClientRect();
    setLensPosition({
      left: event.clientX,
      top: event.clientY,
      contentX: Math.max(0, Math.min(paperRect.width, event.clientX - paperRect.left)),
      contentY: Math.max(0, Math.min(paperRect.height, event.clientY - paperRect.top)),
      paperWidth: paperRect.width,
    });
    if (!magnifierLensVisible) setMagnifierLensVisible(true);
  };

  return (
    <div className={`awb-document-preview flex min-h-full flex-col overflow-hidden bg-transparent ${readOnly ? "awb-preview-readonly" : ""}`}>
      <div
        ref={viewerRef}
        className="awb-document-scroll flex-1 overflow-visible bg-transparent p-0"
        onPointerMove={moveLens}
        onPointerLeave={() => setMagnifierLensVisible(false)}
      >
        <div ref={paperRef} className="w-full overflow-visible bg-white font-mono text-[#0f172a]">
          <AwbPaperContent
            data={data}
            onSaveDraft={onSaveDraft}
            onExportFinalPdf={onExportFinalPdf}
            onFieldChange={onPaperFieldChange}
            onFieldConfirm={onPaperFieldConfirm}
            savingDraft={savingDraft}
            exportingPdf={exportingPdf}
            showActions={false}
          />
        </div>
      </div>

      {magnifierActive && magnifierLensVisible ? (
        <div
          className="pointer-events-none fixed z-50 h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[#3b82f6] shadow-[0_4px_20px_rgba(0,0,0,0.5)] [clip-path:circle(50%_at_50%_50%)]"
          style={{ left: lensPosition.left, top: lensPosition.top }}
        >
          <div
            className="pointer-events-none absolute bg-white"
            style={{
              width: Math.max(1, lensPosition.paperWidth),
              transform: "scale(2)",
              transformOrigin: "top left",
              left: 72.5 - lensPosition.contentX * 2,
              top: 72.5 - lensPosition.contentY * 2,
            }}
          >
            <ModernAwbPaper data={data} />
          </div>
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#3b82f6]/60" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-[#3b82f6]/30" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3b82f6]/70" />
        </div>
      ) : null}

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
        .awb-document-scroll,
        .awb-source-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .awb-document-scroll::-webkit-scrollbar,
        .awb-source-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
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
          font-size: 10px !important;
          font-weight: 500 !important;
          line-height: 1.18 !important;
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
          text-overflow: clip;
        }

        .awb-document-scroll .awb-form .awb-modern-paper textarea {
          flex: none;
          field-sizing: content;
          min-height: 26px;
          overflow: hidden;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
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
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(Boolean(pdfUrl));
  const [previewError, setPreviewError] = useState("");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [sourceMagnifierActive, setSourceMagnifierActive] = useState(true);
  const [sourceLensVisible, setSourceLensVisible] = useState(false);
  const [sourceLensPosition, setSourceLensPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderGenerationRef = useRef(0);
  const sourceLensSize = 145;
  const sourceLensZoom = 2;

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
        const displayScale = 1.5;
        const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
        const qualityScale = Math.min(3, Math.max(2, devicePixelRatio * 2));
        const renderViewport = page.getViewport({
          scale: displayScale * qualityScale,
        });
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);

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
  }, [isPdf, pageNumber, pdfDocument]);

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
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
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
  }, [isPdf, pdfUrl]);

  const moveSourceLens = (event: PointerEvent<HTMLCanvasElement>) => {
    const sourceCanvas = canvasRef.current;
    const lensCanvas = lensCanvasRef.current;
    if (
      !sourceMagnifierActive ||
      !sourceCanvas ||
      !lensCanvas ||
      previewLoading ||
      previewError
    ) {
      setSourceLensVisible(false);
      return;
    }

    const rect = sourceCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setSourceLensVisible(false);
      return;
    }

    const context = lensCanvas.getContext("2d");
    if (!context || !sourceCanvas.width || !sourceCanvas.height) {
      setSourceLensVisible(false);
      return;
    }

    const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    lensCanvas.width = Math.round(sourceLensSize * devicePixelRatio);
    lensCanvas.height = Math.round(sourceLensSize * devicePixelRatio);
    lensCanvas.style.width = `${sourceLensSize}px`;
    lensCanvas.style.height = `${sourceLensSize}px`;

    const scaleX = sourceCanvas.width / rect.width;
    const scaleY = sourceCanvas.height / rect.height;
    const sourceX = x * scaleX;
    const sourceY = y * scaleY;
    const sampleWidth = Math.min(
      sourceCanvas.width,
      (sourceLensSize / sourceLensZoom) * scaleX
    );
    const sampleHeight = Math.min(
      sourceCanvas.height,
      (sourceLensSize / sourceLensZoom) * scaleY
    );
    const sampleX = Math.max(
      0,
      Math.min(sourceCanvas.width - sampleWidth, sourceX - sampleWidth / 2)
    );
    const sampleY = Math.max(
      0,
      Math.min(sourceCanvas.height - sampleHeight, sourceY - sampleHeight / 2)
    );

    context.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
    context.drawImage(
      sourceCanvas,
      sampleX,
      sampleY,
      sampleWidth,
      sampleHeight,
      0,
      0,
      lensCanvas.width,
      lensCanvas.height
    );

    setSourceLensPosition({ x, y });
    setSourceLensVisible(true);
  };

  return (
    <div className="awb-uploaded-pdf-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.03]">
      <div className="awb-source-toolbar flex min-h-[58px] shrink-0 items-center border-b border-white/[0.08] px-3 py-0">
        <div className="text-[11px] font-bold">Source Document</div>
        <span className="ml-2 min-w-0 truncate font-mono text-[9px] text-[#64748b]">
          {fileName}
        </span>
        {isPdf && pageCount > 1 ? (
          <div className="ml-auto flex items-center gap-1 font-mono text-[9px] text-[#94a3b8]">
            <button
              type="button"
              title="Previous page"
              disabled={pageNumber <= 1 || previewLoading}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              &lsaquo;
            </button>
            <span className="min-w-[36px] text-center">{pageNumber}/{pageCount}</span>
            <button
              type="button"
              title="Next page"
              disabled={pageNumber >= pageCount || previewLoading}
              onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] hover:text-white disabled:opacity-40"
            >
              &rsaquo;
            </button>
          </div>
        ) : null}
        <button
          type="button"
          title="Magnifier"
          aria-label="Magnifier"
          aria-pressed={sourceMagnifierActive}
          onClick={() => {
            setSourceMagnifierActive((current) => !current);
            setSourceLensVisible(false);
          }}
          className={`${isPdf && pageCount > 1 ? "ml-2" : "ml-auto"} flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border transition ${
            sourceMagnifierActive
              ? "border-[#2f80ff]/50 bg-[#2f80ff]/15 text-[#60a5fa]"
              : "border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="awb-source-scroll min-h-0 flex-1 overflow-visible bg-transparent p-0">
        {pdfUrl ? (
          <div className="relative min-h-[400px] w-full">
            <canvas
              ref={canvasRef}
              className="block h-auto w-full bg-white"
              onPointerMove={moveSourceLens}
              onPointerLeave={() => setSourceLensVisible(false)}
            />
            {sourceMagnifierActive ? (
              <canvas
                ref={lensCanvasRef}
                className="pointer-events-none absolute z-30 rounded-full border-2 border-[#3b82f6] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] [clip-path:circle(50%_at_50%_50%)]"
                style={{
                  left: sourceLensPosition.x - sourceLensSize / 2,
                  top: sourceLensPosition.y - sourceLensSize / 2,
                  opacity: sourceLensVisible ? 1 : 0,
                  width: sourceLensSize,
                  height: sourceLensSize,
                }}
              />
            ) : null}
            {previewLoading ? (
              <div className="absolute inset-0 flex min-h-[400px] items-center justify-center bg-[#171d2d] text-[11px] text-[#94a3b8]">
                Rendering source preview...
              </div>
            ) : null}
            {previewError ? (
              <div className="absolute inset-0 flex min-h-[400px] items-center justify-center bg-[#171d2d] px-6 text-center text-[11px] text-red-300">
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
  onFieldConfirm,
  manuallyReviewedKeys,
  readOnly = false,
}: {
  extraction: AwbExtractionResponse;
  onFieldChange: (key: string, value: string) => void;
  onFieldConfirm: (key: string) => void;
  manuallyReviewedKeys: Set<string>;
  readOnly?: boolean;
}) {
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const visibleFields = extraction.fields;

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
  };

  return (
    <div className="awb-extracted-fields-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.03]">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {visibleFields.map((field) => {
          const colors = fieldColorClasses(field);
          const isDirty = Object.hasOwn(editingValues, field.key);
          const editingValue = isDirty ? editingValues[field.key] : field.value;
          const canConfirmField =
            !readOnly &&
            !isDirty &&
            field.color !== "blue" &&
            (field.needsReview ||
              field.status === "review" ||
              field.status === "warning" ||
              field.status === "missing" ||
              field.confidence < 0.95);
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
                    {canConfirmField ? (
                      <button
                        type="button"
                        onClick={() => onFieldConfirm(field.key)}
                        className="awb-field-confirm-button inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-400/[0.12] text-emerald-300 transition hover:border-emerald-300/70 hover:bg-emerald-400/20 hover:text-emerald-200"
                        title="Mark as OK"
                        aria-label={`Mark ${field.label} as OK`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </button>
                    ) : null}
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
  const queryClient = useQueryClient();
  const [reviewView, setReviewView] = useState<"form" | "fields">("form");
  const [savingDraft, setSavingDraft] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [awbFormMagnifierActive, setAwbFormMagnifierActive] = useState(false);
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
  const isReviewWorkspaceReady =
    canEdit && !isIssued && extraction.fields.length > 0;
  const activeReview = useActiveReviewTimer(
    extraction.document.id,
    isReviewWorkspaceReady
  );
  const awbPreviewReviewStats = getAwbReviewPresentationStats(formData);

  const updateFieldValue = (key: string, value: string) => {
    if (!canEdit) return;
    activeReview.markActivity();
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

  const confirmFieldValue = (key: string) => {
    if (!canEdit) return;
    activeReview.markActivity();
    let confirmed = false;
    const fields = extraction.fields.map((field) => {
      if (field.key !== key) return field;
      confirmed = true;
      return {
        ...field,
        needsReview: false,
        status: "valid" as const,
        color: "blue" as const,
        comment: "Manually reviewed",
      };
    });
    if (!confirmed) return;
    onExtractionChange({
      ...extraction,
      fields,
      summary: summarizeReviewFields(fields),
    });
    setManuallyReviewedKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    setIsDirty(true);
    setActionNotice(null);
  };

  const saveDraft = async (): Promise<boolean> => {
    activeReview.markActivity();
    setSavingDraft(true);
    setActionNotice(null);
    try {
      const response = await fetch(`/api/awb/documents/${extraction.document.id}/draft`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: extraction.fields.map((field) => ({ key: field.key, value: field.value })),
          reviewCheckpoint: activeReview.prepareCheckpoint("draft_saved"),
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
      activeReview.startNewSession();
      setActionNotice({ type: "success", message: payload?.message || "Draft saved." });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: awbHistoryQueryKeys.all });
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
    const response = await fetch(`/api/awb/documents/${extraction.document.id}/pdf`, {
      credentials: "include",
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
    activeReview.markActivity();
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
    const issueClickedAt = new Date().toISOString();
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
          reviewCheckpoint: activeReview.prepareCheckpoint("issued"),
          issueClickedAt,
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
      activeReview.complete();

      onExtractionChange(payload.data as AwbExtractionResponse);
      setIsDirty(false);
      setActionNotice({ type: "success", message: "AWB issued successfully." });
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: awbHistoryQueryKeys.all });
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

  const refreshTimingMetrics = async () => {
    const response = await fetch(
      `/api/awb/documents/${extraction.document.id}`,
      { credentials: "include", cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false || !payload?.data) {
      throw new Error("Unable to refresh timing metrics.");
    }
    onExtractionChange(payload.data as AwbExtractionResponse);
  };

  return (
    <div
      onInputCapture={activeReview.markActivity}
      onChangeCapture={activeReview.markActivity}
      onKeyDownCapture={activeReview.markActivity}
      onPointerDownCapture={activeReview.markActivity}
      onClickCapture={activeReview.markActivity}
      onFocusCapture={activeReview.markEditableFocus}
      onScrollCapture={activeReview.markScrollActivity}
      className="awb-review-page h-full overflow-y-auto overflow-x-hidden bg-[#050813] text-white"
    >
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

        <div className="awb-review-workspace grid min-w-0 grid-cols-1 items-start gap-4 min-[1024px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="awb-review-left-column flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.02]">
            <div className="flex min-h-[58px] shrink-0 flex-nowrap items-center gap-2 overflow-hidden border-b border-white/[0.08] px-3 py-0">
              <div className="awb-preview-review-summary flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
                <div className="awb-preview-status-chip awb-preview-status-chip-extracted flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-emerald-400/35 bg-emerald-400/[0.12] px-2.5 text-[11px] font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Mapped
                  <strong className="font-mono text-[11px] text-emerald-100">
                    {awbPreviewReviewStats.extracted}/{awbPreviewReviewStats.total}
                  </strong>
                </div>
                <div className="awb-preview-status-chip awb-preview-status-chip-review flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-amber-400/35 bg-amber-400/[0.12] px-2.5 text-[11px] font-semibold text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Review
                  <strong className="font-mono text-[11px] text-amber-100">
                    {awbPreviewReviewStats.review}
                  </strong>
                </div>
                <div className="awb-preview-status-chip awb-preview-status-chip-empty flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-slate-400/25 bg-slate-400/[0.1] px-2.5 text-[11px] font-semibold text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                  Empty
                  <strong className="font-mono text-[11px] text-slate-100">
                    {awbPreviewReviewStats.empty}
                  </strong>
                </div>
                <div className="awb-preview-status-chip awb-preview-status-chip-confidence flex h-[30px] shrink-0 items-center gap-1.5 rounded-[6px] border border-[#2f80ff]/40 bg-[#2f80ff]/15 px-2.5 text-[11px] font-semibold text-blue-200">
                  AI Conf
                  <strong className="font-mono text-[11px] text-blue-100">
                    {awbPreviewReviewStats.averageConfidence == null
                      ? "--"
                      : `${awbPreviewReviewStats.averageConfidence}%`}
                  </strong>
                </div>
              </div>
              {reviewView === "form" ? (
                <button
                  type="button"
                  title="Magnifier"
                  aria-label="Magnifier"
                  aria-pressed={awbFormMagnifierActive}
                  onClick={() => setAwbFormMagnifierActive((current) => !current)}
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] border transition ${
                    awbFormMagnifierActive
                      ? "border-[#2f80ff]/50 bg-[#2f80ff]/15 text-[#60a5fa]"
                      : "border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white"
                  }`}
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              ) : null}
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
                  className={`h-[30px] rounded-[5px] px-3 text-[11px] font-semibold transition max-sm:px-2 ${
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
                  className={`h-[30px] rounded-[5px] px-3 text-[11px] font-semibold transition max-sm:px-2 ${
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
                onFieldConfirm={confirmFieldValue}
                manuallyReviewedKeys={manuallyReviewedKeys}
                readOnly={!canEdit}
              />
            </div>

            <div
              role="tabpanel"
              hidden={reviewView !== "form"}
              className="min-h-0 flex-1 overflow-visible p-2"
            >
              <AwbDocumentPreview
                data={formData}
                onSaveDraft={() => void saveDraft()}
                onExportFinalPdf={() => void issueAwb()}
                onPaperFieldChange={(payloadKey, value) => {
                  const fieldKey = PAPER_PAYLOAD_TO_FIELD_KEY[payloadKey];
                  if (fieldKey) updateFieldValue(fieldKey, value);
                }}
                onPaperFieldConfirm={(payloadKey) => {
                  const fieldKey = PAPER_PAYLOAD_TO_FIELD_KEY[payloadKey];
                  if (fieldKey) confirmFieldValue(fieldKey);
                }}
                savingDraft={savingDraft}
                exportingPdf={issuing}
                readOnly={!canEdit}
                magnifierActive={awbFormMagnifierActive}
              />
            </div>
          </div>

          <div className="awb-review-source-column min-h-0 min-w-0">
            <UploadedPdfPanel fileName={fileName} pdfUrl={pdfUrl} sourceStored={sourceStored} />
          </div>
        </div>

        {awbTimingClientFlags.debugUiEnabled ? (
          <AwbTimingDebugPanel
            extraction={extraction}
            getSnapshot={activeReview.getDebugSnapshot}
            onRefresh={isIssued ? refreshTimingMetrics : undefined}
          />
        ) : null}
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
          background-color: #ffffff !important;
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

        .dashboard-theme-light .awb-review-page .awb-field-confirm-button {
          background-color: #dcfce7 !important;
          border-color: #86efac !important;
          color: #047857 !important;
        }

        .dashboard-theme-light .awb-review-page .awb-field-confirm-button:hover {
          background-color: #bbf7d0 !important;
          border-color: #4ade80 !important;
          color: #065f46 !important;
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

        @media (max-width: 767px) {
          .awb-review-summary > div:nth-child(2) {
            min-width: 0;
            flex: 1;
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
    const uploadStartedAt = new Date().toISOString();
    setExtractionError("");
    setExtraction(null);
    setPhase("processing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadStartedAt", uploadStartedAt);
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
      revokeLocalObjectUrl(currentUrl);
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
  const membershipsQuery = useMemberships();

  useEffect(() => {
    if (membershipsQuery.isPending) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (membershipsQuery.isError) {
        const status = membershipErrorStatus(membershipsQuery.error);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", status);
        if (status === 401 || status === 403) {
          if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] redirect reason: unauthorized");
          router.replace("/login");
          return;
        }
        setAllowed(true);
        return;
      }

      const memberships = membershipsQuery.data || [];
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", 200, memberships.length);

      if (!selectedCompanyId && memberships.length === 1) {
        const cid = memberships[0].company_id;
        setSelectedCompanyId(cid, true);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] selectedCompanyId", cid);
      }

      setAllowed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [
    membershipsQuery.data,
    membershipsQuery.error,
    membershipsQuery.isError,
    membershipsQuery.isPending,
    router,
    selectedCompanyId,
    setSelectedCompanyId,
  ]);

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
          history?: {
            canEdit?: boolean;
            storagePath?: string | null;
            sourceUrl?: string | null;
          };
        };
        setSelectedFile(null);
        setPdfUrl((currentUrl) => {
          revokeLocalObjectUrl(currentUrl);
          return loaded.history?.sourceUrl || null;
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
      revokeLocalObjectUrl(pdfUrl);
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
            revokeLocalObjectUrl(currentUrl);
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

  .dashboard-theme-light .awb-upload-page .awb-processing-view {
    background: radial-gradient(circle at 35% 35%, rgba(59, 130, 246, 0.10), transparent 32%),
      linear-gradient(90deg, #eef4fb 0%, #f8fafc 48%, #f1f5f9 100%) !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-stepper,
  .dashboard-theme-light .awb-upload-page .awb-processing-card {
    background-color: #ffffff !important;
    border-color: #cbd5e1 !important;
    color: #0f172a !important;
    box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-title {
    color: #0f172a !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-subtitle,
  .dashboard-theme-light .awb-upload-page .awb-processing-muted-step {
    color: #475569 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-muted-line,
  .dashboard-theme-light .awb-upload-page .awb-processing-track {
    background-color: #dbe3ef !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-muted-badge {
    border-color: #cbd5e1 !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-spinner {
    border-color: #cbd5e1 !important;
    border-top-color: #2f80ff !important;
  }

  .dashboard-theme-light .awb-upload-page .awb-processing-secondary-action {
    background-color: #ffffff !important;
    border-color: #cbd5e1 !important;
    color: #475569 !important;
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
