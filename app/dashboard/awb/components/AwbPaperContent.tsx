"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CheckCircle2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type AwbPayload = Record<string, unknown>;
type AwbPresentationField = {
  id: string;
  keys: string[];
};

const MODERN_AWB_PRESENTATION_FIELDS: AwbPresentationField[] = [
  { id: "shipper-name-address", keys: ["shipper_address", "Shipper Name and address"] },
  { id: "shipment-referente-number", keys: ["awb_number", "reference_number", "Shipment referente number"] },
  { id: "reference-number", keys: ["reference_number"] },
  { id: "issued-by", keys: ["issued_by", "Issued by"] },
  { id: "consignee-name-address", keys: ["consignee_address", "Consignee Name and address"] },
  { id: "departure-airport", keys: ["airport_departure", "Departure", "Origin"] },
  { id: "destination-airport", keys: ["airport_destination", "Destination", "Destination Airport"] },
  { id: "executed_on_date", keys: ["executed_on_date"] },
  { id: "handling-information", keys: ["handling_info", "Handling Information"] },
  { id: "pieces", keys: ["pieces_value", "Pieces"] },
  { id: "pieces-line", keys: ["pieces_line", "Pieces Line"] },
  { id: "gross-weight", keys: ["gross_weight", "Gross weight"] },
  { id: "weight-line", keys: ["weight_line", "Weight Line"] },
  { id: "weight-unit", keys: ["weight_unit"] },
  { id: "chargeable-weight", keys: ["chargeable_weight", "Chargeable weight"] },
  {
    id: "nature-and-quantity-of-goods",
    keys: ["goods_description", "nature_quantity_goods", "Nature and Quantity of Goods"],
  },
  { id: "dimensions-or-volume", keys: ["dimensions_or_volume"] },
];

type AwbPresentationValue = {
  confidence: number | null;
  color: "green" | "amber" | "red" | "blue" | null;
  hasValue: boolean;
  manualUpdated: boolean;
  needsReview: boolean;
  status: string | null;
  tone: "green" | "amber" | "red" | "blue" | "grey";
};

type FieldVisualState = AwbPresentationValue["tone"];

const FIELD_VISUAL_STYLES: Record<
  FieldVisualState,
  {
    badge: string;
    cell: string;
    inputBackground: string;
  }
> = {
  blue: {
    badge: "border-blue-200 bg-blue-100 text-blue-700",
    cell:
      "bg-blue-50 shadow-[inset_3px_0_0_#60a5fa,inset_0_1px_0_rgba(255,255,255,0.55)]",
    inputBackground: "rgba(219, 234, 254, 0.72)",
  },
  green: {
    badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
    cell:
      "bg-emerald-50 shadow-[inset_3px_0_0_#86efac,inset_0_1px_0_rgba(255,255,255,0.55)]",
    inputBackground: "rgba(220, 252, 231, 0.72)",
  },
  amber: {
    badge: "border-amber-200 bg-amber-100 text-amber-700",
    cell:
      "bg-amber-50 shadow-[inset_3px_0_0_#fcd34d,inset_0_1px_0_rgba(255,255,255,0.55)]",
    inputBackground: "rgba(254, 243, 199, 0.72)",
  },
  red: {
    badge: "border-rose-200 bg-rose-100 text-rose-700",
    cell:
      "bg-rose-50 shadow-[inset_3px_0_0_#fda4af,inset_0_1px_0_rgba(255,255,255,0.55)]",
    inputBackground: "rgba(255, 228, 230, 0.72)",
  },
  grey: {
    badge: "border-slate-200 bg-slate-100 text-slate-500",
    cell:
      "bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
    inputBackground: "rgba(226, 232, 240, 0.72)",
  },
};

function presentationValueForKeys(
  data: AwbPayload | null | undefined,
  keys: string[]
): AwbPresentationValue {
  const emptyValue: AwbPresentationValue = {
    confidence: null,
    color: null,
    hasValue: false,
    manualUpdated: false,
    needsReview: false,
    status: null,
    tone: "grey",
  };
  if (!data) {
    return emptyValue;
  }

  const key = keys.find((candidate) => candidate in data);
  if (!key) {
    return emptyValue;
  }

  const raw = data[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const rawConfidence = Array.isArray(raw) ? raw[1] : null;
  const rawStatus = Array.isArray(raw) ? raw[3] : null;
  const rawColor = Array.isArray(raw) ? raw[4] : null;
  const confidence =
    typeof rawConfidence === "number" && Number.isFinite(rawConfidence)
      ? rawConfidence > 1
        ? rawConfidence / 100
        : rawConfidence
      : null;
  const needsReview = Array.isArray(raw) && raw[2] === true;
  const status = typeof rawStatus === "string" ? rawStatus : null;
  const color =
    rawColor === "green" ||
    rawColor === "amber" ||
    rawColor === "red" ||
    rawColor === "blue"
      ? rawColor
      : null;
  const manualUpdated = color === "blue";
  const hasValue =
    value != null &&
    String(value).trim() !== "" &&
    String(value).trim().toLowerCase() !== "none";
  const tone = (() => {
    if (manualUpdated) return "blue";
    if (
      needsReview ||
      status === "review" ||
      status === "missing" ||
      confidence == null ||
      confidence < 0.85
    ) {
      return "red";
    }
    if (!hasValue) return "grey";
    if (status === "warning" || confidence < 0.95) return "amber";
    return "green";
  })();

  return { confidence, color, hasValue, manualUpdated, needsReview, status, tone };
}

export function getAwbReviewPresentationStats(
  data: AwbPayload | null | undefined
) {
  const values = MODERN_AWB_PRESENTATION_FIELDS.map((field) =>
    presentationValueForKeys(data, field.keys)
  );
  const extracted = values.filter((field) => field.hasValue).length;
  const review = values.filter(
    (field) => field.hasValue && (field.tone === "amber" || field.tone === "red")
  ).length;
  const confidenceValues = values
    .filter((field) => field.hasValue && field.confidence != null)
    .map((field) => field.confidence as number);
  const averageConfidence =
    confidenceValues.length > 0
      ? Math.round(
          (confidenceValues.reduce((total, confidence) => total + confidence, 0) /
            confidenceValues.length) *
            100
        )
      : null;

  return {
    total: values.length,
    extracted,
    review,
    empty: values.length - extracted,
    averageConfidence,
  };
}

type ElementWithDataset = (
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
) & {
  dataset: DOMStringMap & { listenerAttached?: string; userTouched?: string };
};

function AwbPaperCell({
  id,
  label,
  disabled,
  multiline = false,
  compact = false,
  className = "",
  inputClassName = "",
  confidence = null,
  tone = "grey",
  needsReview = false,
  manualUpdated = false,
  onConfirm,
}: {
  id?: string;
  label: string;
  disabled?: boolean;
  multiline?: boolean;
  compact?: boolean;
  className?: string;
  inputClassName?: string;
  confidence?: number | null;
  tone?: "green" | "amber" | "red" | "blue" | "grey";
  needsReview?: boolean;
  manualUpdated?: boolean;
  onConfirm?: () => void;
}) {
  // Cells without an id are presentation-only and must stay non-interactive.
  // Cells with an id are data-backed; their disabled state is managed explicitly
  // to prevent React from fighting the DOM-manipulation approach in AwbFormInner.
  const isDisabled = disabled !== undefined ? disabled : !id;
  const confidencePercent =
    confidence == null ? null : Math.round(confidence * 100);
  const visualStyles = FIELD_VISUAL_STYLES[tone];
  const badgeText = manualUpdated
    ? "Updated"
    : confidencePercent == null
      ? null
      : `${confidencePercent}%`;
  const isPlaceholderOnly = !id && !multiline;
  const valueTopOffset = compact ? "mt-1" : label ? "mt-1.5" : "mt-1";
  const valueSizing = isPlaceholderOnly
    ? "h-[19px] flex-none"
    : multiline
      ? "min-h-[32px] flex-1"
      : "h-[22px] flex-none";
  const valueWidth = "min-w-0 max-w-full w-full";
  const cellMinHeight = compact
    ? "min-h-[44px]"
    : multiline
      ? "min-h-[52px]"
      : isPlaceholderOnly
        ? "min-h-[48px]"
        : "min-h-[46px]";
  const labelMinHeight = compact ? "min-h-[18px]" : "min-h-[18px]";
  const labelPadding = badgeText != null
    ? manualUpdated
      ? "pr-[42px]"
      : "pr-[32px]"
    : "";
  const showConfirmButton =
    Boolean(id) &&
    !isDisabled &&
    Boolean(onConfirm) &&
    tone !== "blue" &&
    (needsReview || tone === "red" || tone === "amber");
  const confirmButtonClass = compact
    ? "right-[4px] bottom-[4px] h-[15px] w-[15px]"
    : "right-[5px] bottom-[5px] h-[18px] w-[18px]";
  const confirmIconClass = compact ? "h-[9px] w-[9px]" : "h-[11px] w-[11px]";
  const fieldClass = `${
    compact
      ? `${valueTopOffset} px-1 py-0.5 text-[8px] leading-[1.2]`
      : `${valueTopOffset} px-1.5 py-1 text-[10px] leading-[1.35]`
  } ${valueSizing} ${valueWidth} rounded-[3px] border-0 font-medium text-slate-900 outline-none placeholder:text-[7px] placeholder:font-normal placeholder:italic placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 ${inputClassName}`;
  return (
    <div
      className={`relative flex ${cellMinHeight} min-w-0 flex-col overflow-hidden border-r border-b border-slate-300 px-[5px] pb-[4px] pt-[3px] ${visualStyles.cell} ${className}`}
    >
      {showConfirmButton ? (
        <button
          type="button"
          onClick={onConfirm}
          className={`absolute ${confirmButtonClass} z-10 inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-100 text-emerald-700 shadow-sm transition hover:bg-emerald-200 hover:text-emerald-800`}
          title="Mark as OK"
          aria-label={`Mark ${label || id} as OK`}
        >
          <CheckCircle2 className={confirmIconClass} />
        </button>
      ) : null}
      {label ? (
        <div
          className={`relative ${labelMinHeight} ${labelPadding}`}
        >
          <span
            className={`block whitespace-normal break-words font-bold uppercase leading-[1.08] tracking-[0.02em] text-slate-500 ${
              compact ? "text-[8px]" : "text-[9px]"
            }`}
          >
            {label}
          </span>
          {badgeText != null ? (
            <span
              className={`absolute right-0 top-0 rounded-[4px] border px-[3px] py-[1px] font-mono text-[6px] font-extrabold leading-none ${visualStyles.badge}`}
              title={
                manualUpdated
                  ? "Human updated"
                  : `${confidencePercent}% extraction confidence${needsReview ? " - review required" : ""}`
              }
            >
              {badgeText}
            </span>
          ) : null}
        </div>
      ) : badgeText != null ? (
          <span
            className={`absolute right-[5px] top-[3px] rounded-[4px] border px-[4px] py-[1px] font-mono text-[7px] font-extrabold leading-none ${visualStyles.badge}`}
            title={
              manualUpdated
                ? "Human updated"
                : `${confidencePercent}% extraction confidence${
                    needsReview ? " - review required" : ""
                  }`
            }
          >
            {badgeText}
          </span>
      ) : null}
      {multiline ? (
        <textarea
          id={id}
          disabled={isDisabled}
          rows={2}
          placeholder="Not extracted"
          className={`${fieldClass} resize-none whitespace-pre-wrap break-words overflow-hidden`}
          style={{ backgroundColor: visualStyles.inputBackground }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
      ) : (
        <input
          id={id}
          disabled={isDisabled}
          type="text"
          placeholder="Not extracted"
          className={fieldClass}
          style={{ backgroundColor: visualStyles.inputBackground }}
        />
      )}
    </div>
  );
}

function AwbPaperNotice({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-h-[46px] min-w-0 flex-col overflow-hidden border-r border-b border-slate-300 bg-white px-[5px] pb-[4px] pt-[3px] text-[7px] leading-[1.45] text-slate-500 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModernAwbPaper({
  data,
  onConfirmField,
}: {
  data?: AwbPayload | null;
  onConfirmField?: (payloadKey: string) => void;
}) {
  const confidenceProps = (id: string) => {
    const field = MODERN_AWB_PRESENTATION_FIELDS.find(
      (candidate) => candidate.id === id
    );
    const value = presentationValueForKeys(data, field?.keys || []);
    const payloadKey = field?.keys.find((candidate) => candidate in (data || {}));
    return {
      confidence: value.hasValue ? value.confidence : null,
      manualUpdated: value.manualUpdated,
      needsReview: value.needsReview,
      onConfirm: payloadKey ? () => onConfirmField?.(payloadKey) : undefined,
      tone: value.tone,
    };
  };

  return (
    <div className="awb-modern-paper w-full overflow-visible rounded-[4px] border border-slate-300 bg-white font-sans text-slate-800">
      <div className="grid grid-rows-[minmax(100px,auto)_minmax(100px,auto)_minmax(75px,auto)_minmax(115px,auto)_minmax(58px,auto)_minmax(125px,auto)_minmax(75px,auto)_minmax(83px,auto)_minmax(100px,auto)]">
        <div className="grid min-h-0 grid-cols-2">
          <div className="grid min-h-0 grid-cols-[57%_43%] border-r border-slate-300">
            <AwbPaperCell
              id="shipper-name-address"
              label="Shipper's Name and Address"
              multiline
              className="row-span-2"
              inputClassName="text-[10px]"
              {...confidenceProps("shipper-name-address")}
            />
            <AwbPaperCell label="Shipper's Account No." />
            <AwbPaperCell label="Phone" />
          </div>
          <div className="grid min-h-0 grid-cols-[26%_74%] grid-rows-[minmax(56px,auto)_minmax(64px,auto)]">
            <div className="col-span-2 flex min-h-[56px] items-center justify-between border-b border-slate-300 pl-3 pr-0">
              <div>
                <div className="text-[6px] font-semibold text-slate-500">Not Negotiable</div>
                <div className="mt-0.5 text-[13px] font-extrabold">Air Waybill</div>
              </div>
              <AwbPaperCell
                id="shipment-referente-number"
                label="AWB Number"
                compact
                className="h-full min-h-0 w-[52%] overflow-hidden border-b-0 border-r-0"
                inputClassName="h-[16px] py-0 font-mono text-[11px] font-bold leading-[16px] text-blue-600"
                {...confidenceProps("shipment-referente-number")}
              />
            </div>
            <div className="flex items-center border-b border-r border-slate-300 px-2 text-[8px] font-bold">
              Issued by
            </div>
            <AwbPaperCell
              id="issued-by"
              label=""
              multiline
              className="border-r-0"
              {...confidenceProps("issued-by")}
            />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-2">
          <div className="grid min-h-0 grid-cols-[57%_43%] border-r border-slate-300">
            <AwbPaperCell
              id="consignee-name-address"
              label="Consignee's Name and Address"
              multiline
              className="row-span-2"
              inputClassName="text-[10px]"
              {...confidenceProps("consignee-name-address")}
            />
            <AwbPaperCell label="Consignee's Account No." />
            <AwbPaperCell label="Phone" />
          </div>
          <AwbPaperNotice className="border-r-0">
            It is agreed that the goods described herein are accepted in apparent good
            order and condition for carriage subject to the conditions of contract on
            the reverse hereof.
          </AwbPaperNotice>
        </div>

        <div className="grid min-h-0 grid-cols-2">
          <div className="grid min-h-0 grid-rows-[minmax(52px,auto)_minmax(46px,auto)] border-r border-slate-300">
            <AwbPaperCell label="Issuing Carrier's Agent Name and City" multiline className="border-r-0" />
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell label="Agent's IATA Code" />
              <AwbPaperCell label="Agent's Account No." className="border-r-0" />
            </div>
          </div>
          <AwbPaperCell label="Accounting Information" multiline className="border-r-0" />
        </div>

        <div className="grid min-h-0 grid-cols-2">
          <div className="grid min-h-0 grid-rows-[minmax(48px,auto)_minmax(44px,auto)_minmax(44px,auto)] border-r border-slate-300">
            <AwbPaperCell
              id="departure-airport"
              label="Airport of Departure and Requested Routing"
              className="border-r-0"
              inputClassName="text-[10px] font-bold"
              {...confidenceProps("departure-airport")}
            />
            <div className="grid min-h-0 grid-cols-[18%_40%_18%_24%]">
              <AwbPaperCell label="To" />
              <AwbPaperCell label="By First Carrier" />
              <AwbPaperCell label="To" />
              <AwbPaperCell label="By" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-[50%_25%_25%]">
              <AwbPaperCell
                id="destination-airport"
                label="Airport of Destination"
                inputClassName="font-bold"
                {...confidenceProps("destination-airport")}
              />
              <AwbPaperCell label="Requested Flight" />
              <AwbPaperCell label="Date" className="border-r-0" />
            </div>
          </div>
          <div className="grid min-h-0 grid-rows-[minmax(44px,auto)_minmax(44px,auto)_minmax(44px,auto)]">
            <div className="grid min-h-0 grid-cols-[42%_58%]">
              <AwbPaperCell
                id="reference-number"
                label="Reference Number"
                {...confidenceProps("reference-number")}
              />
              <AwbPaperCell label="Optional Shipping Information" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-[18%_14%_34%_34%]">
              <AwbPaperCell label="Currency" />
              <AwbPaperCell label="CHGS" />
              <AwbPaperCell label="Declared Value for Carriage" />
              <AwbPaperCell label="Declared Value for Customs" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-[34%_66%]">
              <AwbPaperCell label="Amount of Insurance" />
              <AwbPaperNotice className="border-r-0">
                <strong>Insurance:</strong> If carrier offers insurance, indicate the
                amount to be insured.
              </AwbPaperNotice>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[64%_14%_22%]">
          <AwbPaperCell
            id="handling-information"
            label="Handling Information"
            multiline
            {...confidenceProps("handling-information")}
          />
          <AwbPaperCell label="Special Handling Codes" multiline />
          <AwbPaperCell label="Other Customs Information" multiline className="border-r-0" />
        </div>

        <div className="border-t-2 border-slate-400">
          {/* Data entry row — editable cells with label + input */}
          <div className="grid min-h-0 grid-cols-[9%_16%_9%_14%_12%_8%_32%]">
            <AwbPaperCell
              compact
              id="pieces"
              label="No. of Pieces RCP"
              inputClassName="text-center font-bold"
              {...confidenceProps("pieces")}
            />
            <div className="grid min-h-0 grid-cols-[62%_38%]">
              <AwbPaperCell
                compact
                id="gross-weight"
                label="Gross Weight"
                inputClassName="text-center font-bold"
                {...confidenceProps("gross-weight")}
              />
              <AwbPaperCell
                compact
                id="weight-unit"
                label="kg / lb"
                inputClassName="text-center font-bold text-[9px]"
                {...confidenceProps("weight-unit")}
              />
            </div>
            <AwbPaperCell compact label="Rate Class" inputClassName="text-center" />
            <AwbPaperCell
              compact
              id="chargeable-weight"
              label="Chargeable Weight"
              inputClassName="text-center font-bold"
              {...confidenceProps("chargeable-weight")}
            />
            <AwbPaperCell compact label="Rate / Charge" inputClassName="text-center" />
            <AwbPaperCell compact label="Total" inputClassName="text-center" />
            <div className="grid grid-rows-[auto_auto]">
              <AwbPaperCell
                id="nature-and-quantity-of-goods"
                label="Nature and Quantity of Goods"
                multiline
                className="border-r-0"
                {...confidenceProps("nature-and-quantity-of-goods")}
              />
              <AwbPaperCell
                id="dimensions-or-volume"
                label="Dimensions or Volume"
                multiline
                className="border-r-0"
                {...confidenceProps("dimensions-or-volume")}
              />
            </div>
          </div>

          {/* Bottom AWB result line — line-level fields belong at the end of their columns */}
          <div className="grid grid-cols-[9%_16%_9%_14%_12%_8%_32%] border-t-[1.5px] border-slate-500">
            <AwbPaperCell
              compact
              id="pieces-line"
              label="Pieces Line"
              inputClassName="text-center font-bold"
              {...confidenceProps("pieces-line")}
            />
            <div className="grid grid-cols-[62%_38%]">
              <AwbPaperCell
                compact
                id="weight-line"
                label="Weight Line"
                inputClassName="text-center font-bold"
                {...confidenceProps("weight-line")}
              />
              {/* kg/lb — plain empty */}
              <div className="min-h-[22px] border-r border-b border-slate-300" />
            </div>
            {/* All remaining columns — plain empty boxes */}
            <div className="min-h-[22px] border-r border-b border-slate-300" />
            <div className="min-h-[22px] border-r border-b border-slate-300" />
            <div className="min-h-[22px] border-r border-b border-slate-300" />
            <div className="min-h-[22px] border-r border-b border-slate-300" />
            <div className="min-h-[22px] border-b border-slate-300" />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[37.5%_62.5%]">
          <div className="grid min-h-0 grid-rows-[repeat(3,minmax(44px,auto))] border-r border-slate-300">
            {["Weight Charge", "Valuation Charge", "Tax"].map((label) => (
              <div key={label} className="grid min-h-0 grid-cols-2">
                <AwbPaperCell compact label={`${label} Prepaid`} />
                <AwbPaperCell compact label={`${label} Collect`} className="border-r-0" />
              </div>
            ))}
          </div>
          <AwbPaperCell
            compact
            label="Other Charges"
            multiline
            className="border-r-0"
            inputClassName="text-[9px] leading-[1.4]"
          />
        </div>

        <div className="grid min-h-0 grid-cols-[37.5%_62.5%]">
          <div className="grid min-h-0 grid-rows-[repeat(3,minmax(44px,auto))] border-r border-slate-300">
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell compact label="Total Other Charges Due Agent - Prepaid" />
              <AwbPaperCell compact label="Collect" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell compact label="Total Other Charges Due Carrier - Prepaid" />
              <AwbPaperCell compact label="Collect" className="border-r-0" />
            </div>
            <div className="border-b border-slate-300 bg-slate-100" />
          </div>
          <div className="grid min-h-0 grid-rows-[minmax(70px,auto)_minmax(46px,auto)]">
            <AwbPaperNotice className="border-r-0 text-[7px] leading-[1.5]">
              Shipper certifies that the particulars on the face hereof are
              correct and that dangerous goods, if any, are properly described
              and prepared according to applicable regulations.
            </AwbPaperNotice>
            <AwbPaperCell
              compact
              label="Signature of Shipper or Agent"
              className="border-r-0"
              inputClassName="text-center"
            />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[37.5%_62.5%]">
          <div className="grid min-h-0 grid-rows-[repeat(3,minmax(44px,auto))] border-r border-slate-300">
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell compact label="Total Prepaid" />
              <AwbPaperCell compact label="Total Collect" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell compact label="Currency Conversion Rates" />
              <AwbPaperCell compact label="CC Charges in Destination Currency" className="border-r-0" />
            </div>
            <div className="grid min-h-0 grid-cols-2">
              <AwbPaperCell compact label="For Carrier Use at Destination" />
              <AwbPaperCell compact label="Charges at Destination" className="border-r-0" />
            </div>
          </div>
          <div className="grid min-h-0 grid-rows-[minmax(42px,auto)_minmax(44px,auto)_minmax(44px,auto)]">
            <AwbPaperCell compact label="Print Time" className="border-r-0" />
            <div className="grid min-h-0 min-w-0 grid-cols-[28%_22%_50%]">
              <AwbPaperCell
                compact
                id="executed_on_date"
                label="Executed on (Date)"
                {...confidenceProps("executed_on_date")}
              />
              <AwbPaperCell compact label="At (Place)" />
              <AwbPaperCell compact label="Signature of Carrier / Agent" className="border-r-0" />
            </div>
            <div className="grid min-h-[42px] min-w-0 grid-cols-[34%_66%]">
              <AwbPaperCell
                compact
                label="Total Collect Charges"
                className="overflow-hidden"
                inputClassName="!mt-0 h-[17px] py-0 leading-[17px]"
              />
              <AwbPaperCell
                compact
                id="bottom-awb-number"
                label="AWB Number"
                className="overflow-hidden border-r-0"
                inputClassName="!mt-0 h-[17px] py-0 text-center font-mono text-[11px] font-bold leading-[17px] text-blue-600"
                {...confidenceProps("shipment-referente-number")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Inner Component ---
// function AwbFormInner({ data }: { data?: AwbPayload | null }) 

function AwbFormInner({
  data,
  onSaveDraft,
  onExportFinalPdf,
  onFieldChange,
  onFieldConfirm,
  savingDraft = false,
  exportingPdf = false,
  showActions = true,
}: {
  data?: AwbPayload | null;
  onPdfGenerated?: (url: string) => void;
  onSaveDraft?: () => void;
  onExportFinalPdf?: () => void;
  onFieldChange?: (payloadKey: string, value: string) => void;
  onFieldConfirm?: (payloadKey: string) => void;
  savingDraft?: boolean;
  exportingPdf?: boolean;
  showActions?: boolean;
}) 
  {
  const formRef = useRef<HTMLElement | null>(null);
  const onFieldChangeRef = useRef(onFieldChange);
  const dataShapeRef = useRef("");
  // const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  




  const [popup, setPopup] = useState<{
    visible: boolean;
    title: string;
    message: string;
    color: string;
  }>({
    visible: false,
    title: "",
    message: "",
    color: "emerald", // default green
  });

  useEffect(() => {
    onFieldChangeRef.current = onFieldChange;
  }, [onFieldChange]);

  // Ensure outbound payload contains only values (flattens [value, confidence] arrays)
  // function sanitizeExtractionPayload(
  //   obj: Record<string, any>
  // ): Record<string, any> {
  //   const out: Record<string, any> = {};
  //   for (const [k, v] of Object.entries(obj)) {
  //     out[k] = Array.isArray(v) ? v[0] : v;
  //   }
  //   return out;
  // }
  // function sanitizeExtractionPayload(obj: AwbPayload): AwbPayload {
  //   const out: AwbPayload = {};
  //   for (const [k, v] of Object.entries(obj)) {
  //     out[k] = Array.isArray(v) ? v[0] : v;
  //   }
  //   return out;
  // }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const formElement: HTMLElement = form;
    const listenerCleanups: Array<() => void> = [];
    const dataShape = data ? Object.keys(data).sort().join("|") : "";
    const shouldResetForm = dataShapeRef.current !== dataShape;

    function resetFormInputsAndVisuals() {
      const fields = formElement.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select");

      fields.forEach((el) => {
        el.value = "";
        el.disabled = true;
        el.title = "This field is not handled by the current extraction model.";
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.placeholder = "Not extracted";
        }
        (el as HTMLElement).style.color = "#000";
        if (el.parentElement) {
          (el.parentElement as HTMLElement).style.backgroundColor = "";
        }
        (el as ElementWithDataset).dataset.userTouched = "false";
      });
    }

    if (shouldResetForm) {
      resetFormInputsAndVisuals();
      dataShapeRef.current = dataShape;
    }

    if (!data) {
      return;
    }

    // Fixed mapping: actual HTML element IDs -> keys from stored JSON payload
    const map: Record<string, string[]> = {
      // Shipper / Consignee
      "shipper-name-address": ["shipper_address", "Shipper Name and address"],
      "input-shipper-account-no": ["shipper_account", "Shipper Account number"],
      "shipper-phone-number": ["shipper_phone"],
      "consignee-name-address": ["consignee_address", "Consignee Name and address"],
      "consignee-account-number": ["consignee_account", "Consignee Account number"],
      "consignee-phone-number": ["consignee_phone"],
      // Issuing information
      "issued-by": ["issued_by", "Issued by"],
      "issuing-carrier-agent-name-and-city": ["issuing_agent_name_city", "Issuing carrier agent name and city"],
      "issuing-carrier-agent-iata-code": ["agent_iata_code", "Issuing carrier agent IATA code"],
      "issuing-carrier-agent-account-no": ["agent_account_no", "Issuing carrier agent Account No"],
      // Airports and routing
      "departure-airport": ["airport_departure", "Departure", "Origin"],
      "destination-airport": ["airport_destination", "Destination", "Destination Airport"],
      "routing-and-destination": ["routing_to", "Route"],
      "by-first-carrier": ["by_first_carrier", "By First Carrier"],
      // Flight information
      "requested-flight": ["flight_no", "Requested Flight"],
      // Reference numbers
      "shipment-referente-number": ["awb_number", "reference_number", "Shipment referente number"],
      "reference-number": ["reference_number"],
      "bottom-awb-number": ["awb_number", "reference_number", "Shipment referente number"],
      "shipment-referente-information": ["reference_number2"],
      // Currency and charges
      "currency": ["currency_value", "Charges declaration Currency"],
      "CHGS": ["chgs_value"],
      // Declared values
      "value-for-carriage": ["declared_carriage", "Value for carriage"],
      "value-for-customs": ["declared_customs", "Value for customs"],
      "amount-of-insurance": ["insurance_amount", "Amount of insurance"],
      // Handling and goods
      "handling-information": ["handling_info", "Handling Information"],
      "special-handling-codes": ["special_codes"],
      "pieces": ["pieces_value", "Pieces"],
      "pieces-line": ["pieces_line", "Pieces Line"],
      "gross-weight": ["gross_weight", "Gross weight"],
      "weight-line": ["weight_line", "Weight Line"],
      "chargeable-weight": ["chargeable_weight", "Chargeable weight"],
      "dimensions-or-volume": ["dimensions_or_volume"],
      // Include canonical key saved by Generate AWB
      "nature-and-quantity-of-goods": ["goods_description", "nature_quantity_goods", "Nature and Quantity of Goods"],
      // Additional fields to align with saved payload
      "rate-class-code": ["rate_class_value_side_left", "rate_class_value"],
      "rate-charge": ["rate_charge_value"],
      "total": ["total_value", "total_final_value"],
      "weight-unit": ["weight_unit"],
      "pieces_value_total": ["pieces_value_total"],
      "gross_weight_total": ["gross_weight_total"],
      "Weight-charge-prepaid": ["weight_charge_prepaid"],
      "Weight-charge-collect": ["weight_charge_collect"],
      "valuation_prepaid": ["valuation_prepaid"],
      "valuation_collect": ["valuation_collect"],
      "tax-prepaid": ["tax_prepaid"],
      "tax-collect": ["tax_collect"],
      "charges-declaration-other": ["other_charges"],
      "total_other_charges_due_agent_prepaid": ["total_other_charges_due_agent_prepaid"],
      "total_other_charges_due_agent_collect": ["total_other_charges_due_agent_collect"],
      "total_other_charges_due_carrier_prepaid": ["total_other_charges_due_carrier_prepaid"],
      "total_other_charges_due_carrier_collect": ["total_other_charges_due_carrier_collect"],
      "total-prepaid": ["total_prepaid_value"],
      "total-collected": ["total_collect_value"],
      "currency_conversion_rates": ["currency_conversion_rates"],
      "cc_charges_in_dest_currency": ["cc_charges_in_dest_currency"],
      "for_carrier_use_only_at_destination": ["for_carriers_use_only_at_destination"],
      "charges_at_destination": ["charges_at_destination"],
      "print_time": ["print_time_value"],
      "executed_on_date": ["executed_on_date", "exec_date"],
      "executed_on_place": ["exec_place"],
      "executed_on_signature": ["exec_signature"],
      "total_collect_charges": ["total_collect_charges"],
      "shipper-certification-signature": ["shipper_signature"],
    };

    // function findValue(
    //   dataObj: Record<string, any>,
    //   candidates: string[] | undefined
    // ) {
    //   if (!candidates) return undefined;
    //   for (const k of candidates) {
    //     if (k in dataObj && dataObj[k] != null) return dataObj[k];
    //     const lc = Object.keys(dataObj).find(
    //       (dk) => dk.toLowerCase() === k.toLowerCase()
    //     );
    //     if (lc && dataObj[lc] != null) return dataObj[lc];
    //   }
    //   return undefined;
    // }

    function findValue(dataObj: AwbPayload, candidates?: string[]): unknown {
      if (!candidates) return undefined;
      for (const k of candidates) {
        if (k in dataObj && dataObj[k] != null) return dataObj[k];
        const lc = Object.keys(dataObj).find(
          (dk) => dk.toLowerCase() === k.toLowerCase()
        );
        if (lc && dataObj[lc] != null) return dataObj[lc];
      }
      return undefined;
    }

    // function ensureUserListener(
    //   el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    // ) {
    //   if (!(el as any).dataset?.listenerAttached) {
    //     el.addEventListener("input", (e: any) => {
    //       if (e?.isTrusted) (el as any).dataset.userTouched = "true";
    //     });
    //     (el as any).dataset.listenerAttached = "true";
    //   }
    // }

    function ensureUserListener(el: ElementWithDataset) {
      if (!el.dataset.listenerAttached) {
        el.addEventListener("input", (e: Event) => {
          if ((e as InputEvent).isTrusted) el.dataset.userTouched = "true";
        });
        el.dataset.listenerAttached = "true";
      }
    }

    // function setPlaceholder(
    //   el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    //   text: string,
    //   force = false
    // ) {
    //   if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    //     const current = el.placeholder || "";
    //     if (force || current.trim() === "") {
    //       el.placeholder = text;
    //     }
    //   }
    // }

    // function setElementValueById(id: string, value: any) {
    //   if (value === undefined || value === null) return;
    //   const v =
    //     typeof value === "object" ? JSON.stringify(value) : String(value);
    //   const el = document.getElementById(id) as
    //     | HTMLInputElement
    //     | HTMLTextAreaElement
    //     | HTMLSelectElement
    //     | null;
    //   if (!el) return;
    //   ensureUserListener(el);
    //   // Skip invalids
    //   const lv = v.trim().toLowerCase();
    //   if (lv === "" || lv === "null") return;
    //   // Do not overwrite if user already edited this field
    //   if ((el as any).dataset?.userTouched === "true") return;
    //   el.value = v.trim();
    //   // Apply black when filled
    //   (el as HTMLElement).style.color = "#000";
    //   el.dispatchEvent(new Event("input", { bubbles: true }));
    //   el.dispatchEvent(new Event("change", { bubbles: true }));
    // }

    function setElementValueById(id: string, value: unknown) {
      if (value === undefined || value === null) return;
      const v =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      const el = formElement.querySelector<ElementWithDataset>(`[id="${id}"]`);
      if (!el) return;
      ensureUserListener(el);
      const lv = v.trim().toLowerCase();
      if (lv === "" || lv === "null") return;
      el.value = v.trim();
      (el as HTMLElement).style.color = "#000";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // function extractValueAndConfidence(raw: any): {
    //   value: any;
    //   confidence: number | null;
    // } {
    //   if (Array.isArray(raw) && raw.length > 1) {
    //     const value = raw[0];
    //     // Handle confidence as string or number
    //     let confidence: number | null = null;
    //     if (typeof raw[1] === "number") {
    //       confidence = raw[1];
    //     } else if (typeof raw[1] === "string") {
    //       const parsed = parseFloat(raw[1]);
    //       confidence = !isNaN(parsed) ? parsed : null;
    //     }
    //     console.log(
    //       `[AwbForm] Extracted confidence: ${raw[1]} -> ${confidence}`
    //     );
    //     return { value, confidence };
    //   }
    //   return { value: raw, confidence: null };
    // }

    // Note: payload sanitization is defined at component scope for reuse

    function extractValueAndConfidence(raw: unknown): {
      value: unknown;
      confidence: number | null;
      needReview: boolean;
      status: string | null;
      color: string | null;
    } {
      if (Array.isArray(raw) && raw.length > 1) {
        const value = raw[0];
        let confidence: number | null = null;
        if (typeof raw[1] === "number") confidence = raw[1];
        else if (typeof raw[1] === "string") {
          const parsed = parseFloat(raw[1]);
          confidence = !isNaN(parsed) ? parsed : null;
        }
        const needReview = raw.length > 2 ? raw[2] === true : false;
        const status = typeof raw[3] === "string" ? raw[3] : null;
        const color = typeof raw[4] === "string" ? raw[4] : null;
        return { value, confidence, needReview, status, color };
      }
      return {
        value: raw,
        confidence: null,
        needReview: false,
        status: null,
        color: null,
      };
    }

    // function applyConfidenceTintById(id: string, confidence: number | null) {
    //   if (confidence == null) return;
    //   const el = document.getElementById(id) as HTMLElement | null;
    //   if (!el) {
    //     console.warn(
    //       `[AwbForm] Element with id '${id}' not found for confidence tinting`
    //     );
    //     return;
    //   }
    //   // Prefer the immediate parent container to avoid altering layout
    //   const container = el.parentElement as HTMLElement | null;
    //   if (!container) {
    //     console.warn(
    //       `[AwbForm] Parent container not found for element '${id}'`
    //     );
    //     return;
    //   }
    //   const color =
    //     confidence >= 0.9
    //       ? "rgba(236, 253, 245, 0.8)" // emerald-50 with higher opacity
    //       : confidence >= 0.6
    //       ? "rgba(254, 252, 232, 0.8)" // yellow-50 with higher opacity
    //       : "rgba(255, 241, 242, 0.8)"; // rose-50 with higher opacity
    //   container.style.backgroundColor = color;
    //   console.log(
    //     `[AwbForm] Applied confidence tint to '${id}': ${confidence} -> ${color}`
    //   );
    // }

    function applyConfidenceTintById(
      id: string,
      confidence: number | null,
      needReview: boolean,
      status: string | null,
      color: string | null,
      hasValue: boolean
    ) {
      const el = formElement.querySelector<HTMLElement>(`[id="${id}"]`);
      if (!el || !el.parentElement) return;
      const container = el.parentElement as HTMLElement;
      const tone =
        color === "blue"
          ? "blue"
          : needReview ||
                status === "review" ||
                status === "missing" ||
                confidence == null ||
                confidence < 0.85
              ? "red"
              : !hasValue
                ? "grey"
                : status === "warning" || confidence < 0.95
                  ? "amber"
                  : "green";
      const toneStyles: Record<string, { background: string; shadow: string }> = {
        blue: {
          background: "rgba(239, 246, 255, 0.95)",
          shadow: "inset 3px 0 0 #60a5fa, inset 0 1px 0 rgba(255,255,255,0.55)",
        },
        green: {
          background: "rgba(240, 253, 244, 0.9)",
          shadow: "inset 3px 0 0 #86efac, inset 0 1px 0 rgba(255,255,255,0.55)",
        },
        amber: {
          background: "rgba(255, 251, 235, 0.95)",
          shadow: "inset 3px 0 0 #fcd34d, inset 0 1px 0 rgba(255,255,255,0.55)",
        },
        red: {
          background: "rgba(255, 241, 242, 0.95)",
          shadow: "inset 3px 0 0 #fda4af, inset 0 1px 0 rgba(255,255,255,0.55)",
        },
        grey: {
          background: "rgba(248, 250, 252, 0.95)",
          shadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
        },
      };
      container.style.backgroundColor = toneStyles[tone].background;
      container.style.boxShadow = toneStyles[tone].shadow;
    }

    // const filledSubset: Record<string, any> = {};
    const filledSubset: Record<string, unknown> = {};
    for (const id of Object.keys(map)) {
      const el = formElement.querySelector(`[id="${id}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (!el) {
        continue;
      }
      ensureUserListener(el);

      const raw = findValue(data, map[id]);
      if (raw === undefined) {
        continue;
      }
      el.disabled = false;
      el.title = "";
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.placeholder = "";
      }
      const payloadKey = map[id].find((candidate) => candidate in data) || map[id][0];
      const handleMappedInput = (event: Event) => {
        if (event.isTrusted && onFieldChangeRef.current) {
          onFieldChangeRef.current(payloadKey, el.value);
        }
      };
      el.addEventListener("input", handleMappedInput);
      listenerCleanups.push(() => el.removeEventListener("input", handleMappedInput));

      const { value, confidence, needReview, status, color } =
        extractValueAndConfidence(raw);
      const str = value == null ? "" : String(value).trim();
      if (str.toLowerCase() === "none") {
        (el as HTMLElement).style.color = "#000";
        el.value = "";
        applyConfidenceTintById(id, confidence, needReview, status, color, false);
        continue;
      }

      const before = el.value ?? "";
      if (document.activeElement !== el) {
        setElementValueById(id, str);
      }
      const after = el.value ?? "";
      if (after !== before) {
        filledSubset[id] = after;
      }
      applyConfidenceTintById(
        id,
        confidence,
        needReview,
        status,
        color,
        Boolean(after.trim())
      );
    }

    (
      window as unknown as { __AWB_AUTO_FILLED__?: Record<string, unknown> }
    ).__AWB_AUTO_FILLED__ = filledSubset;
    return () => listenerCleanups.forEach((cleanup) => cleanup());
  }, [data]);

  // Compact dot badge for narrow columns in the disabled legacy charges block.
  const blockDot = (keys: string[]) => {
    const pv = presentationValueForKeys(data, keys);
    if (pv.confidence == null && !pv.needsReview) return null;
    const styles = FIELD_VISUAL_STYLES[pv.tone];
    const pct = pv.confidence == null ? null : Math.round(pv.confidence * 100);
    return (
      <span
        className={`absolute right-[3px] top-[4px] h-[6px] w-[6px] rounded-full border ${styles.badge}`}
        title={pct == null ? "Needs review" : `${pct}% confidence${pv.needsReview ? " - review required" : ""}`}
      />
    );
  };

  // Full text badge for wider columns in the disabled legacy charges block.
  const blockBadge = (keys: string[]) => {
    const pv = presentationValueForKeys(data, keys);
    if (pv.confidence == null && !pv.needsReview) return null;
    const styles = FIELD_VISUAL_STYLES[pv.tone];
    const pct = pv.confidence == null ? null : Math.round(pv.confidence * 100);
    const text = pv.manualUpdated ? "Updated" : pct == null ? null : `${pct}%`;
    if (text == null) return null;
    return (
      <span
        className={`absolute right-[4px] top-[4px] rounded-[4px] border px-[4px] py-[1px] font-mono text-[6px] font-extrabold leading-none ${styles.badge}`}
        title={`${text}${pv.needsReview ? " - review required" : ""}`}
      >
        {text}
      </span>
    );
  };

  return (
    <main
      ref={formRef}
      className={`awb-form ${geistSans.variable} ${geistMono.variable} flex flex-col items-center bg-transparent px-0 py-0`}
    >
      <ModernAwbPaper data={data} onConfirmField={onFieldConfirm} />
      {false && (
      <>
      {/* Legacy AWB paper retained temporarily for reference while the new structure is active. */}
      <div className="h-[297mm] w-full bg-white border border-black shadow-none rounded-none overflow-hidden flex flex-col text-[10px] box-border">
        {/* SECTION 1: strict grid 2 cols x 4 rows (40% of page) */}
        <div className="grid grid-cols-2 grid-rows-4 h-[40%] border-b border-gray-300 dark:border-gray-600">
          {/* 1.1.1 -> left-top cell (address / account+phone inside) */}
          <div className="p-2 border-r border-b border-dashed border-black min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-2 h-full min-h-0">
              {/* Shipper address (left) */}
              <div className="flex flex-col min-h-0 h-full">
                <label className="text-[8px] font-bold">
                  Shipper&apos;s Name and Address
                </label>
                <textarea
                  id="shipper-name-address"
                  className="w-full h-full min-h-0 resize-none border border-gray-400 p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
                  placeholder={`Name and address...`}
                />
              </div>

              {/* Shipper account + phone (right) */}
              <div className="flex flex-col min-h-0 h-full">
                {/* Account area: label ABOVE input (no absolute) */}
                <div className="h-[40%] min-h-0 flex flex-col">
                  <label className="text-[8px] font-bold mb-1">
                    Shipper&apos;s Account Number
                  </label>
                  <div className="w-full border border-black rounded-sm p-1 flex items-center box-border overflow-hidden">
                    {/* input fills and will not push parent (min-w-0 used on parent flex cells) */}
                    <input
                      id="input-shipper-account-no"
                      type="text"
                      className="w-full h-8 text-center font-bold text-[10px] outline-none min-w-0"
                      placeholder=""
                    />
                  </div>
                </div>

                {/* Phone area: make wrapper min-w-0 so input can shrink, input fills width */}
                <div className="h-[60%] min-h-0 flex items-center gap-2 pt-1 min-w-0">
                  <label className="text-[10px] font-bold shrink-0">
                    Phone
                  </label>
                  <div className="flex-1 min-w-0">
                    <input
                      id="shipper-phone-number"
                      type="tel"
                      placeholder="+000000000"
                      className="w-full min-w-0 text-left font-extrabold text-[11px] outline-none border border-black px-2 py-1 truncate placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.2.1 -> right-top cell (AWB header + Issued by) */}
          <div className="p-2 border-b border-dashed border-black min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold">Not Negotiable</div>
              <div className="text-center">
                <h1 className="text-lg font-black tracking-wide">
                  {/* Air Waybill */}
                  AWB Processing
                </h1>
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-2 flex items-start">
              <span className="text-[10px] font-bold mr-2 self-start">
                Issued by
              </span>
              <textarea
                id="issued-by"
                className="flex-1 h-full min-h-0 resize-none border border-black p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
                placeholder={`Issued by...`}
              />
            </div>
          </div>

          {/* 1.1.2 -> left second row (consignee address / account+phone) */}
          <div className="p-2 border-r border-b border-dashed border-black min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-2 h-full min-h-0">
              {/* Consignee address (left) */}
              <div className="flex flex-col min-h-0 h-full">
                <label className="text-[8px] font-bold">
                  Consignee&apos;s Name and Address
                </label>
                <textarea
                  id="consignee-name-address"
                  className="w-full h-full min-h-0 resize-none border border-gray-400 p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
                  placeholder={`Consignee name and address ...`}
                />
              </div>

              {/* Consignee account + phone (right) */}
              <div className="flex flex-col min-h-0 h-full">
                <div className="h-[40%] min-h-0 flex flex-col">
                  <label className="text-[8px] font-bold mb-1">
                    Consignee&apos;s Account Number
                  </label>
                  <div className="w-full border border-black rounded-sm p-1 flex items-center box-border overflow-hidden">
                    <input
                      id="consignee-account-number"
                      type="text"
                      className="w-full h-8 text-center font-bold text-[10px] outline-none min-w-0"
                      placeholder=""
                    />
                  </div>
                </div>

                <div className="h-[60%] min-h-0 flex items-center gap-3 pt-2 min-w-0">
                  <label className="text-[10px] font-bold shrink-0">
                    Phone
                  </label>
                  <div className="flex-1 min-w-0">
                    <input
                      id="consignee-phone-number"
                      type="tel"
                      className="w-full min-w-0 text-left font-extrabold text-[12px] outline-none border border-transparent p-1 truncate placeholder-gray-400 text-gray-400"
                      placeholder="+8613023194906"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.2.2 -> right second row */}
          {/* 1.2.2 -> right second row (Contract terms) */}
          <div className="p-2 border-b border-dashed border-black min-h-0 overflow-hidden flex flex-col">
            <textarea
              className="w-full h-full min-h-0 resize-none border border-black p-2 text-[8px] leading-tight box-border overflow-auto placeholder-gray-400 text-gray-400"
              placeholder=""
            />
          </div>

          {/* 1.1.3 -> third row left (Agent details) */}
          <div className="p-2 border-r border-b border-dashed border-black min-h-0 flex flex-col">
            {/* Top block (2/3 height) */}
            <div className="flex-[2] flex flex-col min-h-0 mb-1">
              <label className="text-[8px] font-bold">
                Issuing Carrier&apos;s Agent Name and City
              </label>
              <textarea
                id="issuing-carrier-agent-name-and-city"
                className="w-full h-full min-h-0 resize-none border border-black p-2 text-[10px] font-bold box-border overflow-auto placeholder-gray-400 text-gray-400"
                placeholder=""
              />
            </div>

            {/* Bottom block (1/3 height, split 2 cols) */}
            <div className="flex-[1] grid grid-cols-2 gap-2 min-h-0">
              {/* Left: IATA Code */}
              <div className="flex flex-col">
                <label className="text-[8px] font-bold">
                  Agent&apos;s IATA Code
                </label>
                <input
                  id="issuing-carrier-agent-iata-code"
                  type="text"
                  className="w-full border border-black px-2 py-1 text-[11px] font-extrabold outline-none placeholder-gray-400 text-gray-400"
                  placeholder=""
                />
              </div>

              {/* Right: Account No. */}
              <div className="flex flex-col">
                <label className="text-[8px] font-bold">
                  Agent&apos;s Account No.
                </label>
                <input
                  id="issuing-carrier-agent-account-no"
                  type="text"
                  className="w-full border border-black px-2 py-1 text-[11px] font-extrabold outline-none"
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* 1.2.3 -> third row right */}
          {/* 1.2.3 -> third row right (Accounting Information) */}
          <div className="p-2 border-b border-dashed border-black min-h-0 flex flex-col">
            <label className="text-[8px] font-bold mb-1">
              Accounting Information
            </label>
            <textarea
              id="accounting-information-details"
              className="w-full h-full min-h-0 resize-none border border-black p-2 text-[11px] font-bold box-border overflow-auto placeholder-gray-400 text-gray-400"
              placeholder={`FCQ\ntd.Flash`}
            />
          </div>

          {/* 1.1.4 -> fourth row left */}
          {/* 1.1.4 â€" compact, labels inside boxes with 6px font */}
          <div className="p-1 border-r min-h-0 flex flex-col gap-[4px] overflow-hidden">
            {/* Block 1 â€" Airport of Departure */}
            <div className="flex flex-col">
              <label className="text-[7px] font-bold leading-none">
                Airport of Departure (Addr. of First Carrier and Requested
                Routing)
              </label>
              <textarea
                id="departure-airport"
                className="w-full resize-none border border-black p-[2px] text-[10px] font-black leading-tight h-8 overflow-hidden placeholder-gray-400"
                placeholder=""
              />
            </div>

            {/* Block 2 â€" 1:4:1:1:1:1 with smaller label font */}
            <div className="grid grid-cols-[1fr_4fr_1fr_1fr_1fr_1fr] gap-[2px]">
              {/* col 1 â€" to */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden"></div>
              {/* col 5 â€" to */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden">
                <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
                  to
                </span>
                <input
                  id="routing-and-destination"
                  className="w-full text-[10px] outline-none border-none placeholder-gray-400"
                  placeholder=""
                />
              </div>

              {/* col 6 â€" by */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden">
                <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
                  by
                </span>
                <input
                  id="by-first-carrier"
                  className="w-full text-[10px] outline-none border-none placeholder-gray-400"
                  placeholder=""
                />
              </div>
            </div>

            {/* Block 3 â€" bottom row */}
            <div className="grid grid-cols-2 gap-[6px]">
              {/* left half â€" Airport of Destination */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden">
                <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
                  Airport of Destination
                </span>
                <input
                  id="destination-airport"
                  className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
                  placeholder="PVG - Pudong"
                />
              </div>

              {/* right half â€" Requested Flight/Date */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden">
                <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
                  Requested Flight/Date
                </span>
                <div className="grid grid-cols-2 w-full">
                  <div className="flex items-end">
                    <input
                      id="requested-flight"
                      className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
                      placeholder="LH8402"
                    />
                  </div>
                  <div className="flex items-end border-l border-black">
                    <input
                      id="requested-date"
                      className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
                      placeholder="/09"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.2.4 -> fourth row right */}
          {/* 1.2.4 â€" grid rows so total height always matches; Row 2 taller */}
          <div className="p-1 min-h-0 grid grid-rows-[1fr_1.4fr_1fr] gap-[2px] overflow-hidden">
            {/* Row 1 â€" 1.3 : 1 : 1 */}
            <div className="grid grid-cols-[1.3fr_2fr] gap-[2px] min-h-0">
              <div className="relative h-full border border-black flex flex-col justify-end min-w-0 px-1">
                {/* heading/label */}
                <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none bg-white px-[2px]">
                  Reference Number
                </span>

                {/* input box */}
                <input
                  id="shipment-referente-number"
                  type="text"
                  placeholder="123456"
                  className="w-full text-[10px] font-bold outline-none border-none text-center placeholder-gray-400 text-gray-400"
                />
              </div>

              <div className="relative h-full border border-black flex flex-col justify-end min-w-0 px-1">
                {/* heading/label */}
                <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none bg-white px-[2px]">
                  Optional Shipping Information
                </span>

                {/* input box */}
                <input
                  id="shipment-referente-information"
                  type="text"
                  placeholder="123456"
                  className="w-full text-[10px] font-bold outline-none border-none text-center placeholder-gray-400 text-gray-400"
                />
              </div>
            </div>

            {/* Row 2 â€" 1.3 : 1 : 1 (taller via grid rows) */}
            <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-[2px] min-h-0">
              {/* LEFT SPLIT -> 4 cols (2 : 1.5 : 2.5 : 2.5) */}
              <div className="grid grid-cols-[2fr_1.5fr_2.5fr_2.5fr] gap-[2px] min-h-0 min-w-0">
                {/* Currency */}
                <div className="relative h-full border border-black flex items-end px-1 min-w-0">
                  <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                    Currency
                  </span>
                  <input
                    id="currency"
                    className="w-full text-[12px] font-black outline-none border-none placeholder-gray-400"
                    placeholder="EUR"
                  />
                </div>

                {/* CHGS */}
                <div className="relative h-full border border-black flex items-end px-1 min-w-0">
                  <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                    CHGS
                  </span>
                  <input
                    id="CHGS"
                    className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
                    placeholder="P"
                  />
                </div>

                {/* WT/VAL */}
                <div className="grid grid-rows-[16px_1fr] h-full border border-black min-w-0">
                  <div className="relative border-b border-black">
                    <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                      WT/VAL
                    </span>
                  </div>
                  <div className="grid grid-cols-2 min-h-0">
                    <div className="border-r border-black grid grid-rows-[auto_1fr]">
                      <div className="px-[2px] text-[6px] leading-none">
                        PPD
                      </div>
                      <div className="border-t border-black flex items-center px-[2px]">
                        <input
                          id="wt_val_ppd_mark"
                          className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
                          placeholder="X"
                        />
                      </div>
                    </div>
                    <div className="grid grid-rows-[auto_1fr]">
                      <div className="px-[2px] text-[6px] leading-none">
                        COLL
                      </div>
                      <div className="border-t border-black flex items-center px-[2px]">
                        <input
                          id="wt_val_coll_mark"
                          className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Other */}
                <div className="grid grid-rows-[16px_1fr] h-full border border-black min-w-0">
                  <div className="relative border-b border-black">
                    <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                      Other
                    </span>
                  </div>
                  <div className="grid grid-cols-2 min-h-0">
                    <div className="border-r border-black grid grid-rows-[auto_1fr]">
                      <div className="px-[2px] text-[6px] leading-none">
                        PPD
                      </div>
                      <div className="border-t border-black flex items-center px-[2px]">
                        <input
                          id="other_ppd_mark"
                          className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
                          placeholder="X"
                        />
                      </div>
                    </div>
                    <div className="grid grid-rows-[auto_1fr]">
                      <div className="px-[2px] text-[6px] leading-none">
                        COLL
                      </div>
                      <div className="border-t border-black flex items-center px-[2px]">
                        <input
                          id="other_coll_mark"
                          className="w-full text-[10px] text-center outline-none border-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Declared Value for Carriage */}
              <div className="relative h-full border border-black flex items-end px-1 min-w-0">
                <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                  Declared Value for Carriage
                </span>
                <input
                  id="value-for-carriage"
                  className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
                  placeholder="NVD"
                />
              </div>

              {/* Declared Value for Customs */}
              <div className="relative h-full border border-black flex items-end px-1 min-w-0">
                <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                  Declared Value for Customs
                </span>
                <input
                  id="value-for-customs"
                  className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
                  placeholder="NCV"
                />
              </div>
            </div>

            {/* Row 3 â€" 1 : 2 */}
            <div className="grid grid-cols-[1fr_2fr] gap-[2px] min-h-0">
              <div className="relative h-full border border-black flex items-end px-1 min-w-0">
                <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
                  Amount of Insurance
                </span>
                <input
                  id="amount-of-insurance"
                  className="w-full text-[12px] font-black outline-none border-none placeholder-gray-400"
                  placeholder="XXX"
                />
              </div>

              <div className="border border-black min-w-0">
                <div className="relative h-full">
                  <div className="absolute inset-x-[2px] bottom-[2px] top-[14px] text-[7px] leading-tight overflow-hidden">
                    INSURANCE: If Carrier offers Insurance, and such insurance
                    is requested in accordance with the conditions thereof,
                    indicate amount to be insured in figures in box marked
                    â€˜Amount of Insuranceâ€™.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 (30% height) */}
        {/* SECTION 2 (30% height) */}
        <div className="h-[30%] border-b border-black flex flex-col">
          {/* === TOP BLOCK: Handling / Special / Other (labels + textareas) === */}
          <div className="flex border-b border-black">
            {/* Handling Information (left) */}
            <div className="flex flex-col border-r border-black basis-[40%]">
              <div className="h-5 text-[7px] font-bold flex items-center px-1">
                Handling Information
              </div>
              <input
                id="handling-information"
                className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400"
                placeholder="PLS NOTIFY CONSIGNEE IMMEDIATELY UPON ARRIVAL"
              />
            </div>

            {/* Special Handling Codes (middle) */}
            <div className="flex flex-col border-r border-black basis-[30%]">
              <div className="h-5 text-[7px] font-bold flex items-center px-1">
                Special Handling Codes
              </div>
              <input
                id="special-handling-codes"
                className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
                placeholder={`ICE PAS FRO
PIL REQ EAW`}
              />
            </div>

            {/* Other Customs Information (right) */}
            <div className="flex flex-col flex-1">
              <div className="h-5 text-[7px] font-bold flex items-center px-1">
                Other Customs Information
              </div>
              <input
                id="other-customs-information"
                className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
                placeholder={`CN/CNE/CP/MR. WANG
CN/CNE/CP/00 13023194906
DE/SHP/CP/0049621759...  X`}
              />
            </div>
          </div>

          {/* === BOTTOM BLOCK: Charges table with footer strip === */}
          <div className="flex-1 grid grid-rows-[1fr_18px]">
            {/* TOP ROW (table body) — grid-cols must exactly match BOTTOM STRIP */}
            <div className="grid grid-cols-[1fr_2fr_0.8fr_2fr_2fr_2fr_2.4fr_6fr]">
              {/* Col 1 — No. of Pieces (narrow → compact dot badge) */}
              <div className="relative flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  No. of Pieces
                </div>
                <input
                  id="pieces"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
                  placeholder="1"
                />
                {blockDot(["pieces_value", "Pieces"])}
              </div>

              {/* Col 2 — Gross Weight (narrow → compact dot badge) */}
              <div className="relative flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Gross Weight
                </div>
                <input
                  id="gross-weight"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
                  placeholder="12"
                />
                {blockDot(["gross_weight", "Gross weight"])}
              </div>

              {/* Col 3 — KG / lb (narrow → compact dot badge) */}
              <div className="relative flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  KG / lb
                </div>
                <div className="flex-1 grid grid-rows-2">
                  <input
                    id="weight-unit"
                    className="w-full text-center text-[8px] outline-none border-none leading-tight placeholder-gray-400 text-gray-400"
                    placeholder="KG"
                  />
                </div>
                {blockDot(["weight_unit"])}
              </div>

              {/* Col 4 — Rate Class (no extraction mapping → no badge) */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Rate Class
                </div>
                <div className="flex-1 grid grid-cols-[1fr_4fr] min-h-0">
                  <input
                    id="rate-class-code"
                    className="border-r border-black w-full text-center text-[11px] font-bold outline-none border-none placeholder-gray-400 text-gray-400"
                    placeholder="M"
                  />
                  <div className="grid grid-rows-[16px_1fr] min-h-0 border-l border-black">
                    <div className="border-t border-b border-black px-[1px] text-[5px] leading-tight flex items-center justify-center text-center overflow-hidden">
                      Commodity Item No.
                    </div>
                    <div className="grid grid-cols-2 h-full">
                      <input
                        id="rate_class_value"
                        className="w-full text-[10px] outline-none border-none text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 5 — Chargeable Weight (wide → full text badge) */}
              <div className="relative flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Chargeable Weight
                </div>
                <input
                  id="chargeable-weight"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
                  placeholder="15"
                />
                {blockBadge(["chargeable_weight", "Chargeable weight"])}
              </div>

              {/* Col 6 — Rate / Charge (no extraction mapping → no badge) */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Rate / Charge
                </div>
                <input
                  id="rate-charge"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
                  placeholder="145.00"
                />
              </div>

              {/* Col 7 — Total (no extraction mapping → no badge) */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Total
                </div>
                <input
                  id="total"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
                  placeholder="145.00"
                />
              </div>

              {/* Col 8 — Nature & Quantity of Goods (wide → full text badge) */}
              <div className="relative flex flex-col">
                <div className="h-8 border-b border-black px-[2px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Nature and Quantity of Goods (incl. Dimensions or Volume)
                </div>
                <textarea
                  id="nature-and-quantity-of-goods"
                  className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400"
                  placeholder={`PHARMACEUTICALS
ENTRECTINIB IMPURITY REFERENCE STANDARD,
DANGEROUS GOODS IN EXCEPTED QUANTITIES
UN1845 DRY ICE
1 X 8 KG
1/39x39x60 cms
HS Code: 29349900
ECD: ART.137 UZK-DA`}
                />
                {blockBadge(["goods_description", "nature_quantity_goods", "Nature and Quantity of Goods"])}
              </div>
            </div>

            {/* BOTTOM STRIP — must use identical grid-cols to TOP ROW above */}
            <div className="grid grid-cols-[1fr_2fr_0.8fr_2fr_2fr_2fr_2.4fr_6fr]">
              <div className="border-t border-r border-black">
                <input
                  id="pieces_value_total"
                  className="w-full h-full text-[10px] leading-none outline-none border-none pl-1 placeholder-gray-400 text-gray-400"
                  placeholder="1"
                />
              </div>
              <div className="border-t border-r border-black">
                <input
                  id="gross_weight_total"
                  className="w-full h-full text-[10px] leading-none outline-none border-none pl-1 placeholder-gray-400 text-gray-400"
                  placeholder="12"
                />
              </div>
              <div className="border-t border-r border-black" />
              <div className="border-t border-r border-black" />
              <div className="border-t border-r border-black" />
              <div className="border-t border-r border-black" />
              <div className="border-t border-r border-black">
                <input
                  id="total_final_value"
                  className="w-full h-full text-[10px] leading-none outline-none border-none pr-1 text-right font-bold placeholder-gray-400 text-gray-400"
                  placeholder="145.00"
                />
              </div>
              <div className="border-t border-black" />
            </div>
          </div>
        </div>

        {/* SECTION 3 (30% height) */}
        {/* SECTION 3 â€" fills remaining space exactly */}
        {/* SECTION 3 â€" exactly 3 rows, each 2 cols (1 : 1.5) */}
        <div className="flex-1 min-h-0 border-b border-black grid grid-rows-3">
          {/* ===== Row 1 ===== */}
          <div className="grid grid-cols-[1fr_1.5fr] border-b border-black min-h-0">
            {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
            <div className="border-r border-black grid grid-rows-3 min-h-0">
              {/* === Sub-row A === */}
              <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
                {/* header (1) */}
                <div className="border-b border-black grid grid-cols-[1fr_2fr_1fr] text-[7px] font-bold">
                  {/* Left col */}
                  <div className="flex items-center justify-center border-r border-black">
                    Prepaid
                  </div>
                  {/* Middle col */}
                  <div className="flex items-center justify-center border-r border-black">
                    Weight Charge
                  </div>
                  {/* Right col */}
                  <div className="flex items-center justify-center">
                    Collect
                  </div>
                </div>

                {/* body (3) */}
                <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
                  {/* Left half */}
                  <div className="border-r border-black p-[2px]">
                    <input
                      id="Weight-charge-prepaid"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                  {/* Right half */}
                  <div className="p-[2px]">
                    <input
                      id="Weight-charge-collect"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row B === */}
              <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
                {/* header (1) */}
                <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                  Valuation Charges
                </div>
                {/* body (3) */}
                {/* body (3) */}
                <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
                  {/* Left half */}
                  <div className="border-r border-black p-[2px]">
                    <input
                      id="valuation_prepaid"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                  {/* Right half */}
                  <div className="p-[2px]">
                    <input
                      id="valuation_collect"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row C === */}
              <div className="grid grid-rows-[1fr_3fr] min-h-0">
                {/* header (1) */}
                <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                  Tax
                </div>
                {/* body (3) */}
                {/* body (3) */}
                <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
                  {/* Left half */}
                  <div className="border-r border-black p-[2px]">
                    <input
                      id="tax-prepaid"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                  {/* Right half */}
                  <div className="p-[2px]">
                    <input
                      id="tax-collect"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col min-h-0">
              <div className="h-5 text-[7px] font-bold flex items-center px-1">
                Other Charges
              </div>
              <textarea
                id="charges-declaration-other"
                className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
                placeholder={`MR-Airfreight Surcharge C 12.75
RA-Dangerous Goods Fee C 60.00`}
              />
            </div>
          </div>

          {/* ===== Row 2 ===== */}
          <div className="grid grid-cols-[1fr_1.5fr] border-b border-black min-h-0">
            {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
            <div className="border-r border-black grid grid-rows-3 min-h-0">
              {/* === Sub-row A === */}
              <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
                <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                  Total Other charges Due agent
                </div>
                {/* body (3) */}
                <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
                  {/* Left half */}
                  <div className="border-r border-black p-[2px]">
                    <input
                      id="total_other_charges_due_agent_prepaid"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                  {/* Right half */}
                  <div className="p-[2px]">
                    <input
                      id="total_other_charges_due_agent_collect"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row B === */}
              <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
                <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                  Total Other charges Due Carrier
                </div>
                <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
                  <div className="border-r border-black p-[2px]">
                    <input
                      id="total_other_charges_due_carrier_prepaid"
                      type="text"
                      placeholder="72.75"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                  <div className="p-[2px]">
                    <input
                      id="total_other_charges_due_carrier_collect"
                      type="text"
                      placeholder="EUR"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row C === */}
              <div className="grid grid-cols-2 border-b border-black min-h-0">
                <div className="border-r border-black p-[2px]">
                  <input
                    type="text"
                    placeholder="217.75"
                    className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                  />
                </div>
                <div className="p-[2px]">
                  <input
                    type="text"
                    placeholder="Signature"
                    className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col min-h-0">
              {/* body */}
              <div className="flex-1 flex flex-col p-[2px]">
                {/* paragraph */}
                <p className="text-[8px] leading-tight">
                  Shipper certifies that the particulars on the face hereof are
                  correct and that insofar as any part of the consignment
                  contains dangerous goods, such part is properly described by
                  name and is in proper condition for carriage by air according
                  to the applicable Dangerous Goods Regulations
                </p>

                {/* spacer grows so the signature sits toward the bottom, like the form */}
                <div className="flex-1" />

                {/* signature line block */}
                <div className="flex flex-col items-center mt-4">
                  {/* input centered above line */}
                  <input
                    type="text"
                    id="shipper-certification-signature"
                    placeholder=""
                    className="text-[10px] font-black tracking-wide text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
                  />

                  {/* short dotted line */}
                  <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />

                  {/* caption */}
                  <div className="text-center text-[7px] mt-1">
                    Signature of Shipper or his Agent
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Row 3 ===== */}
          <div className="grid grid-cols-[1fr_1.5fr] min-h-0">
            {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
            <div className="border-r border-black grid grid-rows-3 min-h-0">
              {/* === Sub-row A === */}
              <div className="grid grid-cols-2 border-b border-black min-h-0">
                {/* Left half */}
                <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    Total prepaid
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="total-prepaid"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>

                {/* Right half */}
                <div className="grid grid-rows-[1fr_3fr] min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    Total Collect
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="total-collected"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row B === */}
              <div className="grid grid-cols-2 border-b border-black min-h-0">
                {/* Left half */}
                <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    Currency Conversion rates
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="currency_conversion_rates"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>

                {/* Right half */}
                <div className="grid grid-rows-[1fr_3fr] min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    CC. Charges in Dest. Currency
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="cc_charges_in_dest_currency"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* === Sub-row C === */}
              <div className="grid grid-cols-2 border-b border-black min-h-0">
                {/* Left half */}
                <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    For Carrier&apos;s use only at Destination
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="for_carrier_use_only_at_destination"
                      type="text"
                      placeholder="123.45"
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>

                {/* Right half */}
                <div className="grid grid-rows-[1fr_3fr] min-h-0">
                  {/* header */}
                  <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
                    Charges at Destination
                  </div>
                  {/* body */}
                  <div className="p-[2px]">
                    <input
                      id="charges_at_destination"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="grid grid-rows-[2fr_1fr] min-h-0">
              {/* Row 1: now with a top bar + two stacked sub-rows */}
              <div className="grid grid-rows-[auto_1fr_auto] border-b border-black min-h-0">
                {/* NEW top row â€" Print Time */}
                <div className="flex items-center px-2 py-1 gap-2 text-[9px] font-bold">
                  <label className="shrink-0">Print Time:</label>
                  <input
                    id="print_time"
                    type="text"
                    placeholder="8/8/2025 10:43:22 AM"
                    className="flex-1 border border-black px-1 py-0.5 outline-none text-[9px] font-normal placeholder-gray-400 text-gray-400"
                  />
                </div>

                {/* Middle row â€" three fields with dotted lines */}
                <div className="grid grid-cols-3 gap-2 items-end px-2">
                  {/* Executed on (Date) */}
                  <div className="flex flex-col items-center">
                    <input
                      id="executed_on_date"
                      type="text"
                      placeholder="08-AUG-25"
                      className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
                    />
                    <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
                  </div>

                  {/* at (Place) */}
                  <div className="flex flex-col items-center">
                    <input
                      id="executed_on_place"
                      type="text"
                      placeholder=""
                      className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
                    />
                    <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
                  </div>

                  {/* Signature */}
                  <div className="flex flex-col items-center">
                    <input
                      id="executed_on_signature"
                      type="text"
                      placeholder="DSCHNEIDER"
                      className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
                    />
                    <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
                  </div>
                </div>

                {/* Bottom row â€" captions */}
                <div className="grid grid-cols-3 text-[7px] text-center leading-tight px-2 pb-1">
                  <div>Executed on (Date)</div>
                  <div>at (Place)</div>
                  <div>Signature of Issuing Carrier or his Agent</div>
                </div>
              </div>

              {/* ===== Row 2 ===== */}
              <div className="grid grid-cols-[1fr_2fr] border-b border-black min-h-0">
                {/* LEFT â€" compact header/body with borders */}
                <div className="border-r border-black grid grid-rows-[12px_1fr] min-h-0">
                  {/* header (shorter height) */}
                  <div className="border-b border-black flex items-center justify-center text-[6px] font-bold leading-none">
                    Total Collect Charges
                  </div>
                  {/* body */}
                  <div className="p-[2px] h-full">
                    <input
                      id="total_collect_charges"
                      type="text"
                      placeholder=""
                      className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                    />
                  </div>
                </div>

                {/* RIGHT column */}
                <div className="flex items-center justify-center text-[9px]">
                  <input
                    id="awb_number_end"
                    type="text"
                    placeholder="000 - 00000000"
                    className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {showActions ? (
      <div className="mt-5 mb-7 flex w-full flex-wrap justify-center gap-2.5 px-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!onSaveDraft || savingDraft || exportingPdf}
          className="inline-flex h-9 w-40 items-center justify-center rounded-[7px] border border-emerald-500/35 bg-emerald-500/[0.08] text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-500/[0.14] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingDraft ? "Saving..." : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={onExportFinalPdf}
          disabled={!onExportFinalPdf || savingDraft || exportingPdf}
          className="inline-flex h-9 w-40 items-center justify-center rounded-[7px] bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(47,128,255,0.2)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#2f80ff]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportingPdf ? "Exporting..." : "Export Final PDF"}
        </button>
      </div>
      ) : null}

      {/* âœ… Custom Colored Popup */}
      {popup.visible && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div
            className={`rounded-2xl shadow-2xl bg-white border-t-4 ${
              popup.color === "rose"
                ? "border-rose-500"
                : popup.color === "amber"
                ? "border-amber-400"
                : "border-blue-500"
            } w-[380px] max-w-[90%] p-6 text-center`}
          >
            <h2
              className={`text-xl font-bold mb-2 ${
                popup.color === "rose"
                  ? "text-rose-600"
                  : popup.color === "amber"
                  ? "text-amber-500"
                  : "text-blue-600"
              }`}
            >
              {popup.title}
            </h2>
            <p className="text-gray-700 mb-6">{popup.message}</p>
            <button
              onClick={() =>
                setPopup({
                  visible: false,
                  title: "",
                  message: "",
                  color: "emerald",
                })
              }
              className={`px-6 py-2 rounded-full text-white font-semibold shadow-md ${
                popup.color === "rose"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : popup.color === "amber"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-blue-600 hover:bg-blue-700"
              } transition-all duration-200`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
    
  );
}

// export default function AwbForm(props: { data?: AwbPayload | null }) {
export default function AwbForm(props: {
  data?: AwbPayload | null;
  onPdfGenerated?: (url: string) => void;
  onSaveDraft?: () => void;
  onExportFinalPdf?: () => void;
  onFieldChange?: (payloadKey: string, value: string) => void;
  onFieldConfirm?: (payloadKey: string) => void;
  savingDraft?: boolean;
  exportingPdf?: boolean;
  showActions?: boolean;
}) {
  return ( 
    <Suspense
      fallback={
        <div className="p-10 text-center text-gray-400">Loading form...</div>
      }
    >
      <AwbFormInner {...props} />
    </Suspense>
  );
}
