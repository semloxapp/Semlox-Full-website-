// // "use client";
// // import React, { useEffect, useState } from "react";
// // import { useAuth } from "../../context/AuthContext";
// // import { useCompany } from "../../context/CompanyContext";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import { Geist, Geist_Mono } from "next/font/google";

// // const geistSans = Geist({
// //   variable: "--font-geist-sans",
// //   subsets: ["latin"],
// // });

// // const geistMono = Geist_Mono({
// //   variable: "--font-geist-mono",
// //   subsets: ["latin"],
// // });

// // type AwbPayload = Record<string, unknown>;
// // type ElementWithDataset = (
// //   | HTMLInputElement
// //   | HTMLTextAreaElement
// //   | HTMLSelectElement
// // ) & {
// //   dataset: DOMStringMap & { listenerAttached?: string; userTouched?: string };
// // };



// // // export default function AwbForm({ data }: { data?: Record<string, any> | null }) {
// // export default function AwbForm({ data }: { data?: AwbPayload | null }) {
// //   const { user } = useAuth();
// //   const { selectedCompanyId } = useCompany();
// //   const router = useRouter();
// //   const searchParams = useSearchParams();
// //   const [generating, setGenerating] = useState(false);

// "use client";

// import React, { Suspense, useEffect, useState } from "react";
// import { useAuth } from "../../context/AuthContext";
// import { useCompany } from "../../context/CompanyContext";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Geist, Geist_Mono } from "next/font/google";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// type AwbPayload = Record<string, unknown>;
// type ElementWithDataset = (
//   | HTMLInputElement
//   | HTMLTextAreaElement
//   | HTMLSelectElement
// ) & {
//   dataset: DOMStringMap & { listenerAttached?: string; userTouched?: string };
// };

// // --- Inner Component ---
// function AwbFormInner({ data }: { data?: AwbPayload | null }) {
//   const { user } = useAuth();
//   const { selectedCompanyId } = useCompany();
//   const router = useRouter();
//   const searchParams = useSearchParams(); // âœ… still here, but safe inside Suspense
//   const [generating, setGenerating] = useState(false);

//   const [popup, setPopup] = useState<{
//     visible: boolean;
//     title: string;
//     message: string;
//     color: string;
//   }>({
//     visible: false,
//     title: "",
//     message: "",
//     color: "emerald", // default green
//   });

//   // Ensure outbound payload contains only values (flattens [value, confidence] arrays)
//   // function sanitizeExtractionPayload(
//   //   obj: Record<string, any>
//   // ): Record<string, any> {
//   //   const out: Record<string, any> = {};
//   //   for (const [k, v] of Object.entries(obj)) {
//   //     out[k] = Array.isArray(v) ? v[0] : v;
//   //   }
//   //   return out;
//   // }
//   // function sanitizeExtractionPayload(obj: AwbPayload): AwbPayload {
//   //   const out: AwbPayload = {};
//   //   for (const [k, v] of Object.entries(obj)) {
//   //     out[k] = Array.isArray(v) ? v[0] : v;
//   //   }
//   //   return out;
//   // }

//   useEffect(() => {
//     if (!data) {
//       console.log("ðŸš« [FORM POPULATION] No data provided, skipping form population");
//       return;
//     }

//     console.groupCollapsed("ðŸŽ¯ [FORM POPULATION] Starting form field population process");
//     console.log("ðŸ“Š Input data object:", data);
//     console.log("ðŸ”¢ Total data fields:", Object.keys(data).length);
//     console.log("ðŸ“ Data structure analysis:");
//     const dataAnalysis = Object.entries(data).reduce((acc, [ value]) => {
//       const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
//       acc[type] = (acc[type] || 0) + 1;
//       return acc;
//     }, {} as Record<string, number>);
//     console.log("  Field types:", dataAnalysis);
//     console.groupEnd();

//     // Fixed mapping: actual HTML element IDs -> keys from stored JSON payload
//     const map: Record<string, string[]> = {
//       // Shipper / Consignee
//       "shipper-name-address": ["shipper_address", "Shipper Name and address"],
//       "input-shipper-account-no": ["shipper_account", "Shipper Account number"],
//       "shipper-phone-number": ["shipper_phone"],
//       "consignee-name-address": ["consignee_address", "Consignee Name and address"],
//       "consignee-account-number": ["consignee_account", "Consignee Account number"],
//       "consignee-phone-number": ["consignee_phone"],
//       // Issuing information
//       "issued-by": ["issued_by", "Issued by"],
//       "issuing-carrier-agent-name-and-city": ["issuing_agent_name_city", "Issuing carrier agent name and city"],
//       "issuing-carrier-agent-iata-code": ["agent_iata_code", "Issuing carrier agent IATA code"],
//       "issuing-carrier-agent-account-no": ["agent_account_no", "Issuing carrier agent Account No"],
//       // Airports and routing
//       "departure-airport": ["airport_departure", "Departure", "Origin"],
//       "destination-airport": ["airport_destination", "Destination", "Destination Airport"],
//       "routing-and-destination": ["routing_to", "Route"],
//       "by-first-carrier": ["by_first_carrier", "By First Carrier"],
//       // Flight information
//       "requested-flight": ["flight_no", "Requested Flight"],
//       "requested-date": ["flight_date", "Requested Flight Date"],
//       // Reference numbers
//       "shipment-referente-number": ["reference_number", "Shipment referente number"],
//       "shipment-referente-information": ["reference_number2"],
//       // Currency and charges
//       "currency": ["currency_value", "Charges declaration Currency"],
//       "CHGS": ["chgs_value"],
//       // Declared values
//       "value-for-carriage": ["declared_carriage", "Value for carriage"],
//       "value-for-customs": ["declared_customs", "Value for customs"],
//       "amount-of-insurance": ["insurance_amount", "Amount of insurance"],
//       // Handling and goods
//       "handling-information": ["handling_info", "Handling Information"],
//       "special-handling-codes": ["special_codes"],
//       "pieces": ["pieces_value", "Pieces"],
//       "gross-weight": ["gross_weight", "Gross weight"],
//       "chargeable-weight": ["chargeable_weight", "Chargeable weight"],
//       // Include canonical key saved by Generate AWB
//       "nature-and-quantity-of-goods": ["goods_description", "nature_quantity_goods", "Nature and Quantity of Goods"],
//       // Additional fields to align with saved payload
//       "rate-class-code": ["rate_class_value_side_left", "rate_class_value"],
//       "rate-charge": ["rate_charge_value"],
//       "total": ["total_value", "total_final_value"],
//       "weight-unit": ["weight_unit"],
//       "pieces_value_total": ["pieces_value_total"],
//       "gross_weight_total": ["gross_weight_total"],
//       "Weight-charge-prepaid": ["weight_charge_prepaid"],
//       "Weight-charge-collect": ["weight_charge_collect"],
//       "valuation_prepaid": ["valuation_prepaid"],
//       "valuation_collect": ["valuation_collect"],
//       "tax-prepaid": ["tax_prepaid"],
//       "tax-collect": ["tax_collect"],
//       "charges-declaration-other": ["other_charges"],
//       "total_other_charges_due_agent_prepaid": ["total_other_charges_due_agent_prepaid"],
//       "total_other_charges_due_agent_collect": ["total_other_charges_due_agent_collect"],
//       "total_other_charges_due_carrier_prepaid": ["total_other_charges_due_carrier_prepaid"],
//       "total_other_charges_due_carrier_collect": ["total_other_charges_due_carrier_collect"],
//       "total-prepaid": ["total_prepaid_value"],
//       "total-collected": ["total_collect_value"],
//       "currency_conversion_rates": ["currency_conversion_rates"],
//       "cc_charges_in_dest_currency": ["cc_charges_in_dest_currency"],
//       "for-carrier-use-only-at-destination": ["for_carriers_use_only_at_destination"],
//       "charges_at_destination": ["charges_at_destination"],
//       "print_time": ["print_time_value"],
//       "executed-on-date": ["exec_date"],
//       "executed-on-place": ["exec_place"],
//       "executed-on-signature": ["exec_signature"],
//       "total_collect_charges": ["total_collect_charges"],
//       "shipper-certification-signature": ["shipper_signature"],
//     };

//     // function findValue(
//     //   dataObj: Record<string, any>,
//     //   candidates: string[] | undefined
//     // ) {
//     //   if (!candidates) return undefined;
//     //   for (const k of candidates) {
//     //     if (k in dataObj && dataObj[k] != null) return dataObj[k];
//     //     const lc = Object.keys(dataObj).find(
//     //       (dk) => dk.toLowerCase() === k.toLowerCase()
//     //     );
//     //     if (lc && dataObj[lc] != null) return dataObj[lc];
//     //   }
//     //   return undefined;
//     // }

//     function findValue(dataObj: AwbPayload, candidates?: string[]): unknown {
//       if (!candidates) return undefined;
//       for (const k of candidates) {
//         if (k in dataObj && dataObj[k] != null) return dataObj[k];
//         const lc = Object.keys(dataObj).find(
//           (dk) => dk.toLowerCase() === k.toLowerCase()
//         );
//         if (lc && dataObj[lc] != null) return dataObj[lc];
//       }
//       return undefined;
//     }

//     // function ensureUserListener(
//     //   el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
//     // ) {
//     //   if (!(el as any).dataset?.listenerAttached) {
//     //     el.addEventListener("input", (e: any) => {
//     //       if (e?.isTrusted) (el as any).dataset.userTouched = "true";
//     //     });
//     //     (el as any).dataset.listenerAttached = "true";
//     //   }
//     // }

//     function ensureUserListener(el: ElementWithDataset) {
//       if (!el.dataset.listenerAttached) {
//         el.addEventListener("input", (e: Event) => {
//           if ((e as InputEvent).isTrusted) el.dataset.userTouched = "true";
//         });
//         el.dataset.listenerAttached = "true";
//       }
//     }

//     // function setPlaceholder(
//     //   el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
//     //   text: string,
//     //   force = false
//     // ) {
//     //   if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
//     //     const current = el.placeholder || "";
//     //     if (force || current.trim() === "") {
//     //       el.placeholder = text;
//     //     }
//     //   }
//     // }

//     function setPlaceholder(
//       el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
//       text: string,
//       force = false
//     ) {
//       if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
//         const current = el.placeholder || "";
//         if (force || current.trim() === "") el.placeholder = text;
//       }
//     }

//     // function setElementValueById(id: string, value: any) {
//     //   if (value === undefined || value === null) return;
//     //   const v =
//     //     typeof value === "object" ? JSON.stringify(value) : String(value);
//     //   const el = document.getElementById(id) as
//     //     | HTMLInputElement
//     //     | HTMLTextAreaElement
//     //     | HTMLSelectElement
//     //     | null;
//     //   if (!el) return;
//     //   ensureUserListener(el);
//     //   // Skip invalids
//     //   const lv = v.trim().toLowerCase();
//     //   if (lv === "" || lv === "null") return;
//     //   // Do not overwrite if user already edited this field
//     //   if ((el as any).dataset?.userTouched === "true") return;
//     //   el.value = v.trim();
//     //   // Apply black when filled
//     //   (el as HTMLElement).style.color = "#000";
//     //   el.dispatchEvent(new Event("input", { bubbles: true }));
//     //   el.dispatchEvent(new Event("change", { bubbles: true }));
//     // }

//     function setElementValueById(id: string, value: unknown) {
//       if (value === undefined || value === null) return;
//       const v =
//         typeof value === "object" ? JSON.stringify(value) : String(value);
//       const el = document.getElementById(id) as ElementWithDataset | null;
//       if (!el) return;
//       ensureUserListener(el);
//       const lv = v.trim().toLowerCase();
//       if (lv === "" || lv === "null") return;
//       if (el.dataset.userTouched === "true") return;
//       el.value = v.trim();
//       (el as HTMLElement).style.color = "#000";
//       el.dispatchEvent(new Event("input", { bubbles: true }));
//       el.dispatchEvent(new Event("change", { bubbles: true }));
//     }

//     // function extractValueAndConfidence(raw: any): {
//     //   value: any;
//     //   confidence: number | null;
//     // } {
//     //   if (Array.isArray(raw) && raw.length > 1) {
//     //     const value = raw[0];
//     //     // Handle confidence as string or number
//     //     let confidence: number | null = null;
//     //     if (typeof raw[1] === "number") {
//     //       confidence = raw[1];
//     //     } else if (typeof raw[1] === "string") {
//     //       const parsed = parseFloat(raw[1]);
//     //       confidence = !isNaN(parsed) ? parsed : null;
//     //     }
//     //     console.log(
//     //       `[AwbForm] Extracted confidence: ${raw[1]} -> ${confidence}`
//     //     );
//     //     return { value, confidence };
//     //   }
//     //   return { value: raw, confidence: null };
//     // }

//     // Note: payload sanitization is defined at component scope for reuse

//     function extractValueAndConfidence(raw: unknown): {
//       value: unknown;
//       confidence: number | null;
//     } {
//       if (Array.isArray(raw) && raw.length > 1) {
//         const value = raw[0];
//         let confidence: number | null = null;
//         if (typeof raw[1] === "number") confidence = raw[1];
//         else if (typeof raw[1] === "string") {
//           const parsed = parseFloat(raw[1]);
//           confidence = !isNaN(parsed) ? parsed : null;
//         }
//         return { value, confidence };
//       }
//       return { value: raw, confidence: null };
//     }

//     // function applyConfidenceTintById(id: string, confidence: number | null) {
//     //   if (confidence == null) return;
//     //   const el = document.getElementById(id) as HTMLElement | null;
//     //   if (!el) {
//     //     console.warn(
//     //       `[AwbForm] Element with id '${id}' not found for confidence tinting`
//     //     );
//     //     return;
//     //   }
//     //   // Prefer the immediate parent container to avoid altering layout
//     //   const container = el.parentElement as HTMLElement | null;
//     //   if (!container) {
//     //     console.warn(
//     //       `[AwbForm] Parent container not found for element '${id}'`
//     //     );
//     //     return;
//     //   }
//     //   const color =
//     //     confidence >= 0.9
//     //       ? "rgba(236, 253, 245, 0.8)" // emerald-50 with higher opacity
//     //       : confidence >= 0.6
//     //       ? "rgba(254, 252, 232, 0.8)" // yellow-50 with higher opacity
//     //       : "rgba(255, 241, 242, 0.8)"; // rose-50 with higher opacity
//     //   container.style.backgroundColor = color;
//     //   console.log(
//     //     `[AwbForm] Applied confidence tint to '${id}': ${confidence} -> ${color}`
//     //   );
//     // }

//     function applyConfidenceTintById(id: string, confidence: number | null) {
//       if (confidence == null) return;
//       const el = document.getElementById(id) as HTMLElement | null;
//       if (!el || !el.parentElement) return;
//       const container = el.parentElement as HTMLElement;
//       const color =
//         confidence >= 0.9
//           ? "rgba(236, 253, 245, 0.8)"
//           : confidence >= 0.6
//           ? "rgba(254, 252, 232, 0.8)"
//           : "rgba(255, 241, 242, 0.8)";
//       container.style.backgroundColor = color;
//     }

//     // const filledSubset: Record<string, any> = {};
//     const filledSubset: Record<string, unknown> = {};
//     let processedCount = 0;
//     let populatedCount = 0;
//     let skippedCount = 0;

//     console.log("ðŸ”„ [FORM POPULATION] Processing form fields...");
//     console.log(`ðŸ“‹ Total form fields to process: ${Object.keys(map).length}`);

//     for (const id of Object.keys(map)) {
//       processedCount++;
//       const el = document.getElementById(id) as
//         | HTMLInputElement
//         | HTMLTextAreaElement
//         | HTMLSelectElement
//         | null;
//       if (!el) {
//         console.log(`âŒ [FORM POPULATION] Element not found: ${id}`);
//         skippedCount++;
//         continue;
//       }
//       ensureUserListener(el);

//       const raw = findValue(data, map[id]);
//       console.log(
//         `ðŸ” [FORM POPULATION] Field '${id}' - candidates: [${map[id].join(', ')}] - raw value:`,
//         raw,
//         `(type: ${typeof raw}, isArray: ${Array.isArray(raw)})`
//       );
//       if (raw === undefined) {
//         // No matching API field found
//         console.log(`âšª [FORM POPULATION] No data found for field '${id}'`);
//         // if ((el as any).dataset?.userTouched === "true") continue; // dont alter user-edited
//         if ((el as ElementWithDataset).dataset?.userTouched === "true") {
//           console.log(`ðŸ‘¤ [FORM POPULATION] Field '${id}' was user-edited, skipping`);
//           skippedCount++;
//           continue; // dont alter user-edited
//         }
//         const current = (el.value || "").trim();
//         if (current === "") {
//           (el as HTMLElement).style.color = "#888"; // gray placeholder
//           setPlaceholder(el, "â€”");
//         }
//         skippedCount++;
//         continue;
//       }

//       const { value, confidence, needReview } = extractValueAndConfidence(raw);
//       console.log(
//         `ðŸŽ¯ [FORM POPULATION] Processing field '${id}': value='${value}', confidence=${confidence}`
//       );
//       const str = value == null ? "" : String(value).trim();
//       if (str.toLowerCase() === "none") {
//         // Explicit no value
//         // if ((el as any).dataset?.userTouched === "true") continue;
//         if ((el as ElementWithDataset).dataset?.userTouched === "true")
//           continue;

//         (el as HTMLElement).style.color = "red";
//         setPlaceholder(el, "âš  No value found", true);
//         // still apply tint for visibility
//         applyConfidenceTintById(id, confidence, needReview);
//         continue;
//       }

//       const before = el.value ?? "";
//       setElementValueById(id, str);
//       const after = el.value ?? "";
//       if (after && after !== before) {
//         filledSubset[id] = after;
//         applyConfidenceTintById(id, confidence, needReview);
//         populatedCount++;
//         console.log(`âœ… [FORM POPULATION] Successfully populated field '${id}': '${before}' â†’ '${after}'`);
//       } else {
//         console.log(`âš ï¸ [FORM POPULATION] Field '${id}' not changed (before: '${before}', after: '${after}')`);
//         skippedCount++;
//       }
//     }
    
//     // Final summary
//     console.groupCollapsed("ðŸ“Š [FORM POPULATION] Population Summary");
//     console.log(`ðŸ”¢ Total fields processed: ${processedCount}`);
//     console.log(`âœ… Successfully populated: ${populatedCount}`);
//     console.log(`âš ï¸ Skipped/unchanged: ${skippedCount}`);
//     console.log(`ðŸ“ˆ Success rate: ${processedCount > 0 ? Math.round((populatedCount / processedCount) * 100) : 0}%`);
//     console.groupEnd();
    
//     // Output sanitized JSON (subset of filled fields)
//     try {
//       // (window as any).__AWB_AUTO_FILLED__ = filledSubset;
//       (
//         window as unknown as { __AWB_AUTO_FILLED__?: Record<string, unknown> }
//       ).__AWB_AUTO_FILLED__ = filledSubset;

//       console.groupCollapsed(
//         "ðŸ’¾ [FORM POPULATION] Final populated fields data"
//       );
//       console.log("ðŸŽ¯ Populated fields object:", filledSubset);
//       console.log("ðŸ“ JSON representation:", JSON.stringify(filledSubset, null, 2));
//       console.log("ðŸ”‘ Populated field names:", Object.keys(filledSubset));
//       console.log("ðŸ”¢ Total populated fields:", Object.keys(filledSubset).length);
//       console.groupEnd();
//     } catch (error) {
//       console.error("ðŸ’¥ [FORM POPULATION] Failed to log populated fields:", error);
//     }
//   }, [data]);

//   async function handleGenerateFromForm() {
//     setGenerating(true);
//     // New field mapping for the external API endpoint
//     const outgoingMap: Record<string, string> = {
//       "shipper-name-address": "shipper_address",
//       "input-shipper-account-no": "shipper_account",
//       "shipper-phone-number": "shipper_phone",
//       "issued-by": "issued_by",
//       "consignee-phone-number": "consignee_phone",
//       "consignee-account-number": "consignee_account",
//       "consignee-name-address": "consignee_address",
//       "issuing-carrier-agent-name-and-city": "issuing_agent_name_city",
//       "issuing-carrier-agent-iata-code": "agent_iata_code",
//       "issuing-carrier-agent-account-no": "agent_account_no",
//       "accounting-information-details": "accounting_information",
//       "routing-and-destination": "routing_to",
//       "by-first-carrier": "by_first_carrier",
//       "destination-airport": "airport_destination",
//       "departure-airport": "airport_departure",
//       "requested-flight": "flight_no",
//       "requested-date": "flight_date",
//       "shipment-referente-number": "reference_number",
//       "shipment-referente-information": "reference_number2",
//       "currency": "currency_value",
//       "CHGS": "chgs_value",
//       "wt_val_ppd_mark": "wt_val_ppd_mark",
//       "wt_val_coll_mark": "wt_val_coll_mark",
//       "other_ppd_mark": "other_ppd_mark",
//       "other_coll_mark": "other_coll_mark",
//       "value-for-carriage": "declared_carriage",
//       "value-for-customs": "declared_customs",
//       "amount-of-insurance": "insurance_amount",
//       "handling-information": "handling_info",
//       "special-handling-codes": "special_codes",
//       "other-customs-information": "other_customs_info",
//       "pieces": "pieces_value",
//       "pieces_value_total": "pieces_value_total",
//       "gross-weight": "gross_weight",
//       "gross_weight_total": "gross_weight_total",
//       "weight-unit": "weight_unit",
//       "rate-class-code": "rate_class_value_side_left",
//       "rate_class_value": "rate_class_value",
//       "chargeable-weight": "chargeable_weight",
//       "rate-charge": "rate_charge_value",
//       "total": "total_value",
//       "total_final_value": "total_final_value",
//       "nature-and-quantity-of-goods": "goods_description",
//       "Weight-charge-prepaid": "weight_charge_prepaid",
//       "Weight-charge-collect": "weight_charge_collect",
//       "valuation_prepaid": "valuation_prepaid",
//       "valuation_collect": "valuation_collect",
//       "tax-prepaid": "tax_prepaid",
//       "tax-collect": "tax_collect",
//       "charges-declaration-other": "other_charges",
//       "total_other_charges_due_agent_prepaid": "total_other_charges_due_agent_prepaid",
//       "total_other_charges_due_agent_collect": "total_other_charges_due_agent_collect",
//       "shipper-certification-signature": "shipper_signature",
//       "total_other_charges_due_carrier_prepaid": "total_other_charges_due_carrier_prepaid",
//       "total_other_charges_due_carrier_collect": "total_other_charges_due_carrier_collect",
//       "total-prepaid": "total_prepaid_value",
//       "total-collected": "total_collect_value",
//       "currency_conversion_rates": "currency_conversion_rates",
//       "cc_charges_in_dest_currency": "cc_charges_in_dest_currency",
//       "for-carrier-use-only-at-destination": "for_carriers_use_only_at_destination",
//       "charges_at_destination": "charges_at_destination",
//       "print_time": "print_time_value",
//       "executed-on-date": "exec_date",
//       "executed-on-place": "exec_place",
//       "executed-on-signature": "exec_signature",
//       "total_collect_charges": "total_collect_charges"
//     };

//     // const payload: Record<string, any> = {};
//     const payload: Record<string, unknown> = {};

//     // Collect all form values according to the mapping
//     for (const [id, key] of Object.entries(outgoingMap)) {
//       const el = document.getElementById(id) as
//         | HTMLInputElement
//         | HTMLTextAreaElement
//         | HTMLSelectElement
//         | HTMLElement
//         | null;
      
//       let val = "";
//       if (el) {
//         if (
//           el instanceof HTMLInputElement ||
//           el instanceof HTMLTextAreaElement ||
//           el instanceof HTMLSelectElement
//         ) {
//           val = el.value ?? "";
//         } else {
//           val = (el.textContent ?? "").trim();
//         }
//       }
      
//       // Always include the field, even if empty
//       payload[key] = val;
//     }

//     // Add fields that should be empty strings (marked as empty in mappings)
//     payload["routing_to2"] = "";
//     payload["routing_by1"] = "";
//     payload["routing_to3"] = "";
//     payload["routing_by2"] = "";
//     payload["reference_number3"] = "";
//     payload["SCI"] = "";
//     payload["rate_charge_value_total"] = "";
//     payload["total_volume"] = "";
//     payload["awb_number_end"] = "";

//     // Persist AWB + history to backend before generating PDF
//     try {
//       if (user?.id && selectedCompanyId) {
//         // Console log the JSON payload being stored in database
//         try {
//           console.groupCollapsed("ðŸ’¾ [DATABASE SAVE] Preparing to save AWB data to database");
//           console.log("ðŸ†” User ID:", user.id);
//           console.log("ðŸ¢ Company ID:", selectedCompanyId);
//           console.log("ðŸ“„ AWB ID (if updating):", searchParams.get("awb_id") || "Creating new");
//           console.log("ðŸ”¢ Total payload fields:", Object.keys(payload).length);
//           console.log("ðŸ“Š Payload field analysis:");
//           const payloadAnalysis = Object.entries(payload).reduce((acc, [ value]) => {
//             const type = typeof value;
//             const isEmpty = !value || String(value).trim() === "";
//             acc.types[type] = (acc.types[type] || 0) + 1;
//             if (isEmpty) acc.empty++;
//             else acc.filled++;
//             return acc;
//           }, { types: {} as Record<string, number>, empty: 0, filled: 0 });
//           console.log("  Field types:", payloadAnalysis.types);
//           console.log("  Filled fields:", payloadAnalysis.filled);
//           console.log("  Empty fields:", payloadAnalysis.empty);
//           console.log("ðŸ’¾ Complete payload object:", payload);
//           console.log("ðŸ“ Payload JSON string:", JSON.stringify(payload, null, 2));
//           console.log("ðŸŒ Full database request body:", JSON.stringify({
//             companyId: selectedCompanyId,
//             userId: user.id,
//             payload,
//             note: "Generated PDF",
//             awbId: searchParams.get("awb_id") || undefined,
//           }, null, 2));
//           console.groupEnd();
//         } catch (logError) {
//           console.error("ðŸ’¥ [DATABASE SAVE] Failed to log database payload:", logError);
//         }

//         let procRes = await fetch("/api/awb/process", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             companyId: selectedCompanyId,
//             userId: user.id,
//             payload,
//             note: "Generated PDF",
//             awbId: searchParams.get("awb_id") || undefined,
//           }),
//         });
//         let procJson = await procRes
//           .json()
//           .catch(() => ({} as Record<string, unknown>));
//         if (!procRes.ok) {
//           // Fallback: if AWB id in URL is stale or missing, retry without awbId to create a new record
//           if (
//             procRes.status === 404 &&
//             String(procJson?.error || "")
//               .toLowerCase()
//               .includes("awb not found")
//           ) {
//             try {
//               console.warn(
//                 "[AWB Generate] AWB not found, retrying create without awbId"
//               );
//               procRes = await fetch("/api/awb/process", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                   companyId: selectedCompanyId,
//                   userId: user.id,
//                   payload,
//                   note: "Generated PDF",
//                 }),
//               });
//               procJson = await procRes
//                 .json()
//                 .catch(() => ({} as Record<string, unknown>));
//             } catch (retryErr) {
//               console.error("[AWB Generate] Retry failed", retryErr);
//             }
//           }
//         }

//         if (!procRes.ok) {
//           console.error("AWB persist failed", procRes.status, procJson);
//           alert(
//             `Save failed (${procRes.status}). History not recorded. Error: ${
//               procJson?.error || "unknown"
//             }`
//           );
//         } else if (procJson?.awbId) {
//           // Log successful database storage
//           try {
//             console.groupCollapsed("âœ… [DATABASE SAVE] Successfully saved AWB data to database");
//             console.log("ðŸŽ‰ Operation successful!");
//             console.log("ðŸ†” AWB ID:", procJson.awbId);
//             console.log("ðŸ“Š Response status:", procRes.status);
//             console.log("ðŸ’¾ Stored payload fields:", Object.keys(payload).length);
//             console.log("ðŸ“„ Complete stored payload:", payload);
//             console.log("ðŸŒ Full database response:", procJson);
//             console.log("ðŸ“ Response JSON:", JSON.stringify(procJson, null, 2));
//             console.groupEnd();
//           } catch (logError) {
//             console.error("ðŸ’¥ [DATABASE SAVE] Failed to log database success:", logError);
//           }

//           // Keep awb_id in the URL so returning to the page reloads saved data
//           const params = new URLSearchParams(window.location.search);
//           params.set("company_id", selectedCompanyId);
//           params.set("awb_id", String(procJson.awbId));
//           router.replace(`${window.location.pathname}?${params.toString()}`);

//           // Attempt to assign/consume an AWB number and inject into payload
//           try {
//             console.log("ðŸ”¢ [AWB NUMBER] Attempting to assign AWB number", {
//               awbId: procJson.awbId,
//               userId: user.id,
//             });
//             const assignRes = await fetch("/api/awb/assign-number", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 awbId: procJson.awbId,
//                 userId: user.id,
//                 payload,
//               }),
//             });
//             const assignJson = await assignRes
//               .json()
//               .catch(() => ({} as Record<string, unknown>));
//             if (!assignRes.ok) {
//               console.warn(
//                 "âš ï¸ [AWB NUMBER] Assignment failed",
//                 assignRes.status,
//                 assignJson
//               );
//             } else if (assignJson?.awb_number) {
//               // Set both camelCase and spaced keys for compatibility
//               payload["awbNumber"] = assignJson.awb_number;
//               payload["AWB Number"] = assignJson.awb_number;
//               console.log(
//                 "âœ… [AWB NUMBER] Successfully assigned AWB number:",
//                 assignJson.awb_number
//               );
//             } else {
//               console.warn(
//                 "âš ï¸ [AWB NUMBER] Response received but no AWB number provided",
//                 assignJson
//               );
//             }
//           } catch (e: unknown) {
//             // catch (e: any) {
//             //   console.error(
//             //     "[AWB Generate] Assign-number error",
//             //     e?.message || e
//             //   );
//             // }
//             const err = e as { message?: string };
//             console.error(
//               "[AWB Generate] Assign-number error",
//               err.message || e
//             );
//           }
//         }
//       }

//       // Print payload before sending to new API (debug)
//       try {
//         console.groupCollapsed("[AWB Generate] Payload to new API endpoint");
//         console.log(payload);
//         console.log("JSON string:", JSON.stringify(payload, null, 2));
//         console.groupEnd();
//       } catch {}

//       const res = await fetch("https://semloxai.vercel.app/api/generate-awb", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const txt = await res.text().catch(() => "");
//         console.error("Generate failed", res.status, txt);
//         alert("Generate failed: " + res.status + " â€” check console.");
//         setGenerating(false);
//         return;
//       }

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       // Use reference_number for filename (mapped from shipment-referente-number)
//       const filenameCandidate = payload["reference_number"];
//       const safeFilename =
//         String(filenameCandidate || "awb")
//           .replace(/[\\/:*?"<>|]+/g, "_")
//           .trim() || "awb";
//       a.download = `${safeFilename}.pdf`;
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);
//       setGenerating(false);
//     } catch (e) {
//       console.error(e);
//       alert("Generate failed â€” see console.");
//       setGenerating(false);
//     }
//   }

//   async function handleSaveDraft() {
//     // Build payload from current form inputs (same mapping as generate)
//     const outgoingMap: Record<string, string> = {
//       // Align draft payload keys to canonical snake_case used in Generate AWB
//       "shipper-name-address": "shipper_address",
//       "input-shipper-account-no": "shipper_account",
//       "shipper-phone-number": "shipper_phone",
//       "issued-by": "issued_by",
//       "consignee-phone-number": "consignee_phone",
//       "consignee-account-number": "consignee_account",
//       "consignee-name-address": "consignee_address",
//       "issuing-carrier-agent-name-and-city": "issuing_agent_name_city",
//       "issuing-carrier-agent-iata-code": "agent_iata_code",
//       "issuing-carrier-agent-account-no": "agent_account_no",
//       "accounting-information-details": "accounting_information",
//       "routing-and-destination": "routing_to",
//       "by-first-carrier": "by_first_carrier",
//       "destination-airport": "airport_destination",
//       "departure-airport": "airport_departure",
//       "requested-flight": "flight_no",
//       "requested-date": "flight_date",
//       "shipment-referente-number": "reference_number",
//       "shipment-referente-information": "reference_number2",
//       "currency": "currency_value",
//       "CHGS": "chgs_value",
//       "wt_val_ppd_mark": "wt_val_ppd_mark",
//       "wt_val_coll_mark": "wt_val_coll_mark",
//       "other_ppd_mark": "other_ppd_mark",
//       "other_coll_mark": "other_coll_mark",
//       "value-for-carriage": "declared_carriage",
//       "value-for-customs": "declared_customs",
//       "amount-of-insurance": "insurance_amount",
//       "handling-information": "handling_info",
//       "special-handling-codes": "special_codes",
//       "other-customs-information": "other_customs_info",
//       "pieces": "pieces_value",
//       "pieces_value_total": "pieces_value_total",
//       "gross-weight": "gross_weight",
//       "gross_weight_total": "gross_weight_total",
//       "weight-unit": "weight_unit",
//       "rate-class-code": "rate_class_value_side_left",
//       "rate_class_value": "rate_class_value",
//       "chargeable-weight": "chargeable_weight",
//       "rate-charge": "rate_charge_value",
//       "total": "total_value",
//       "total_final_value": "total_final_value",
//       "nature-and-quantity-of-goods": "goods_description",
//       "Weight-charge-prepaid": "weight_charge_prepaid",
//       "Weight-charge-collect": "weight_charge_collect",
//       "valuation_prepaid": "valuation_prepaid",
//       "valuation_collect": "valuation_collect",
//       "tax-prepaid": "tax_prepaid",
//       "tax-collect": "tax_collect",
//       "charges-declaration-other": "other_charges",
//       "total_other_charges_due_agent_prepaid": "total_other_charges_due_agent_prepaid",
//       "total_other_charges_due_agent_collect": "total_other_charges_due_agent_collect",
//       "shipper-certification-signature": "shipper_signature",
//       "total_other_charges_due_carrier_prepaid": "total_other_charges_due_carrier_prepaid",
//       "total_other_charges_due_carrier_collect": "total_other_charges_due_carrier_collect",
//       "total-prepaid": "total_prepaid_value",
//       "total-collected": "total_collect_value",
//       "currency_conversion_rates": "currency_conversion_rates",
//       "cc_charges_in_dest_currency": "cc_charges_in_dest_currency",
//       "for-carrier-use-only-at-destination": "for_carriers_use_only_at_destination",
//       "charges_at_destination": "charges_at_destination",
//       "print_time": "print_time_value",
//       "executed-on-date": "exec_date",
//       "executed-on-place": "exec_place",
//       "executed-on-signature": "exec_signature",
//       "total_collect_charges": "total_collect_charges",
//     };

//     // const payload: Record<string, any> = {};
//     const payload: Record<string, unknown> = {};

//     for (const [id, key] of Object.entries(outgoingMap)) {
//       const el = document.getElementById(id) as
//         | HTMLInputElement
//         | HTMLTextAreaElement
//         | HTMLSelectElement
//         | HTMLElement
//         | null;
//       let val = "";

//       if (
//         el instanceof HTMLInputElement ||
//         el instanceof HTMLTextAreaElement ||
//         el instanceof HTMLSelectElement
//       ) {
//         val = el.value ?? "";
//       } else {
//         val = (el?.textContent ?? "").trim();
//       }
//       // Always include the field, even if empty, to keep payload shape consistent
//       payload[key] = val;
//     }

//     // Add fields that should be empty strings (marked as empty in mappings)
//     payload["routing_to2"] = "";
//     payload["routing_by1"] = "";
//     payload["routing_to3"] = "";
//     payload["routing_by2"] = "";
//     payload["reference_number3"] = "";
//     payload["SCI"] = "";
//     payload["rate_charge_value_total"] = "";
//     payload["total_volume"] = "";
//     payload["awb_number_end"] = "";

//     try {
//       if (user?.id && selectedCompanyId) {
//         const procRes = await fetch("/api/awb/process", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             companyId: selectedCompanyId,
//             userId: user.id,
//             payload,
//             note: "Saved draft",
//             awbId: searchParams.get("awb_id") || undefined,
//           }),
//         });
//         const procJson = await procRes
//           .json()
//           .catch(() => ({} as Record<string, unknown>));
//         if (!procRes.ok) {
//           console.error("AWB save draft failed", procRes.status, procJson);
//           alert(
//             `Save draft failed (${procRes.status}). Error: ${
//               procJson?.error || "unknown"
//             }`
//           );
//           return;
//         }
//         if (procJson?.awbId) {
//           const params = new URLSearchParams(window.location.search);
//           params.set("company_id", selectedCompanyId);
//           params.set("awb_id", String(procJson.awbId));
//           try {
//             localStorage.setItem("last_awb_id", String(procJson.awbId));
//             localStorage.setItem("last_company_id", selectedCompanyId);
//           } catch {}
//           router.replace(`${window.location.pathname}?${params.toString()}`);
//         }
//         // alert("Draft saved.");
//         setPopup({
//           visible: true,
//           title: "âœ… Draft Saved",
//           message: "Your draft has been saved successfully.",
//           color: "emerald",
//         });

//       } else {
//         alert("No user or company context available.");
//       }
//     } catch (e) {
//       console.error(e);
//       alert("Save draft failed â€” see console.");
//     }
//   }

//   return (
//     <main
//       className={`awb-form ${geistSans.variable} ${geistMono.variable}  flex flex-col py-6 px-3 md:px-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`}
//     >
//       {generating && (
//         <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md flex items-center justify-center">
//           <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/95 dark:bg-gray-800/95 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.24)] border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
//             <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
//             <div className="text-base font-semibold text-gray-700 dark:text-gray-300 animate-pulse">
//               Generating PDFâ€¦
//             </div>
//           </div>
//         </div>
//       )}
//       {/* A4 sheet with enhanced styling */}
//       <div className="w-[210mm] h-[297mm] mx-2 md:mx-4 bg-white border border-gray-300 dark:border-gray-600 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.16)] rounded-lg overflow-hidden backdrop-blur-sm ring-1 ring-gray-200/50 dark:ring-gray-700/50 flex flex-col text-[14px] box-border">
//         {/* SECTION 1: strict grid 2 cols x 4 rows (40% of page) */}
//         <div className="grid grid-cols-2 grid-rows-4 h-[40%] border-b border-gray-300 dark:border-gray-600">
//           {/* 1.1.1 -> left-top cell (address / account+phone inside) */}
//           <div className="p-2 border-r border-b border-dashed border-black min-h-0 overflow-hidden">
//             <div className="grid grid-cols-2 gap-2 h-full min-h-0">
//               {/* Shipper address (left) */}
//               <div className="flex flex-col min-h-0 h-full">
//                 <label className="text-[8px] font-bold">
//                   Shipperâ€™s Name and Address
//                 </label>
//                 <textarea
//                   id="shipper-name-address"
//                   className="w-full h-full min-h-0 resize-none border border-gray-400 p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
//                   placeholder={`Name and address...`}
//                 />
//               </div>

//               {/* Shipper account + phone (right) */}
//               <div className="flex flex-col min-h-0 h-full">
//                 {/* Account area: label ABOVE input (no absolute) */}
//                 <div className="h-[40%] min-h-0 flex flex-col">
//                   <label className="text-[8px] font-bold mb-1">
//                     Shipperâ€™s Account Number
//                   </label>
//                   <div className="w-full border border-black rounded-sm p-1 flex items-center box-border overflow-hidden">
//                     {/* input fills and will not push parent (min-w-0 used on parent flex cells) */}
//                     <input
//                       id="input-shipper-account-no"
//                       type="text"
//                       className="w-full h-8 text-center font-bold text-[10px] outline-none min-w-0"
//                       placeholder=""
//                     />
//                   </div>
//                 </div>

//                 {/* Phone area: make wrapper min-w-0 so input can shrink, input fills width */}
//                 <div className="h-[60%] min-h-0 flex items-center gap-2 pt-1 min-w-0">
//                   <label className="text-[10px] font-bold shrink-0">
//                     Phone
//                   </label>
//                   <div className="flex-1 min-w-0">
//                     <input
//                       id="shipper-phone-number"
//                       type="tel"
//                       placeholder="+000000000"
//                       className="w-full min-w-0 text-left font-extrabold text-[11px] outline-none border border-black px-2 py-1 truncate placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* 1.2.1 -> right-top cell (AWB header + Issued by) */}
//           <div className="p-2 border-b border-dashed border-black min-h-0 flex flex-col overflow-hidden">
//             <div className="flex items-center justify-between">
//               <div className="text-[10px] font-bold">Not Negotiable</div>
//               <div className="text-center">
//                 <h1 className="text-lg font-black tracking-wide">
//                   Air Waybill
//                 </h1>
//               </div>
//             </div>

//             <div className="flex-1 min-h-0 mt-2 flex items-start">
//               <span className="text-[10px] font-bold mr-2 self-start">
//                 Issued by
//               </span>
//               <textarea
//                 id="issued-by"
//                 className="flex-1 h-full min-h-0 resize-none border border-black p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
//                 placeholder={`Issued by...`}
//               />
//             </div>
//           </div>

//           {/* 1.1.2 -> left second row (consignee address / account+phone) */}
//           <div className="p-2 border-r border-b border-dashed border-black min-h-0 overflow-hidden">
//             <div className="grid grid-cols-2 gap-2 h-full min-h-0">
//               {/* Consignee address (left) */}
//               <div className="flex flex-col min-h-0 h-full">
//                 <label className="text-[8px] font-bold">
//                   Consigneeâ€™s Name and Address
//                 </label>
//                 <textarea
//                   id="consignee-name-address"
//                   className="w-full h-full min-h-0 resize-none border border-gray-400 p-2 text-[10px] box-border overflow-auto placeholder-gray-400 text-gray-400"
//                   placeholder={`Consignee name and address ...`}
//                 />
//               </div>

//               {/* Consignee account + phone (right) */}
//               <div className="flex flex-col min-h-0 h-full">
//                 <div className="h-[40%] min-h-0 flex flex-col">
//                   <label className="text-[8px] font-bold mb-1">
//                     Consigneeâ€™s Account Number
//                   </label>
//                   <div className="w-full border border-black rounded-sm p-1 flex items-center box-border overflow-hidden">
//                     <input
//                       id="consignee-account-number"
//                       type="text"
//                       className="w-full h-8 text-center font-bold text-[10px] outline-none min-w-0"
//                       placeholder=""
//                     />
//                   </div>
//                 </div>

//                 <div className="h-[60%] min-h-0 flex items-center gap-3 pt-2 min-w-0">
//                   <label className="text-[10px] font-bold shrink-0">
//                     Phone
//                   </label>
//                   <div className="flex-1 min-w-0">
//                     <input
//                       id="consignee-phone-number"
//                       type="tel"
//                       className="w-full min-w-0 text-left font-extrabold text-[12px] outline-none border border-transparent p-1 truncate placeholder-gray-400 text-gray-400"
//                       placeholder="+8613023194906"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* 1.2.2 -> right second row */}
//           {/* 1.2.2 -> right second row (Contract terms) */}
//           <div className="p-2 border-b border-dashed border-black min-h-0 overflow-hidden flex flex-col">
//             <textarea
//               className="w-full h-full min-h-0 resize-none border border-black p-2 text-[8px] leading-tight box-border overflow-auto placeholder-gray-400 text-gray-400"
//               placeholder=""
//             />
//           </div>

//           {/* 1.1.3 -> third row left (Agent details) */}
//           <div className="p-2 border-r border-b border-dashed border-black min-h-0 flex flex-col">
//             {/* Top block (2/3 height) */}
//             <div className="flex-[2] flex flex-col min-h-0 mb-1">
//               <label className="text-[8px] font-bold">
//                 Issuing Carrierâ€™s Agent Name and City
//               </label>
//               <textarea
//                 id="issuing-carrier-agent-name-and-city"
//                 className="w-full h-full min-h-0 resize-none border border-black p-2 text-[10px] font-bold box-border overflow-auto placeholder-gray-400 text-gray-400"
//                 placeholder=""
//               />
//             </div>

//             {/* Bottom block (1/3 height, split 2 cols) */}
//             <div className="flex-[1] grid grid-cols-2 gap-2 min-h-0">
//               {/* Left: IATA Code */}
//               <div className="flex flex-col">
//                 <label className="text-[8px] font-bold">
//                   Agentâ€™s IATA Code
//                 </label>
//                 <input
//                   id="issuing-carrier-agent-iata-code"
//                   type="text"
//                   className="w-full border border-black px-2 py-1 text-[11px] font-extrabold outline-none placeholder-gray-400 text-gray-400"
//                   placeholder=""
//                 />
//               </div>

//               {/* Right: Account No. */}
//               <div className="flex flex-col">
//                 <label className="text-[8px] font-bold">
//                   Agentâ€™s Account no.
//                 </label>
//                 <input
//                   id="issuing-carrier-agent-account-no"
//                   type="text"
//                   className="w-full border border-black px-2 py-1 text-[11px] font-extrabold outline-none"
//                   placeholder=""
//                 />
//               </div>
//             </div>
//           </div>

//           {/* 1.2.3 -> third row right */}
//           {/* 1.2.3 -> third row right (Accounting Information) */}
//           <div className="p-2 border-b border-dashed border-black min-h-0 flex flex-col">
//             <label className="text-[8px] font-bold mb-1">
//               Accounting Information
//             </label>
//             <textarea
//               id="accounting-information-details"
//               className="w-full h-full min-h-0 resize-none border border-black p-2 text-[11px] font-bold box-border overflow-auto placeholder-gray-400 text-gray-400"
//               placeholder={`FCQ\ntd.Flash`}
//             />
//           </div>

//           {/* 1.1.4 -> fourth row left */}
//           {/* 1.1.4 â€” compact, labels inside boxes with 6px font */}
//           <div className="p-1 border-r min-h-0 flex flex-col gap-[4px] overflow-hidden">
//             {/* Block 1 â€” Airport of Departure */}
//             <div className="flex flex-col">
//               <label className="text-[7px] font-bold leading-none">
//                 Airport of Departure (Addr. of First Carrier and Requested
//                 Routing)
//               </label>
//               <textarea
//                 id="departure-airport"
//                 className="w-full resize-none border border-black p-[2px] text-[10px] font-black leading-tight h-9 placeholder-gray-400"
//                 placeholder=""
//               />
//             </div>

//             {/* Block 2 â€” 1:4:1:1:1:1 with smaller label font */}
//             <div className="grid grid-cols-[1fr_4fr_1fr_1fr_1fr_1fr] gap-[2px]">
//               {/* col 1 â€” to */}
//               <div className="relative h-7 border border-black flex items-end"></div>
//               {/* col 5 â€” to */}
//               <div className="relative h-7 border border-black flex items-end">
//                 <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
//                   to
//                 </span>
//                 <input
//                   id="routing-and-destination"
//                   className="w-full text-[10px] outline-none border-none placeholder-gray-400"
//                   placeholder=""
//                 />
//               </div>

//               {/* col 6 â€” by */}
//               <div className="relative h-7 border border-black flex items-end">
//                 <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
//                   by
//                 </span>
//                 <input
//                   id="by-first-carrier"
//                   className="w-full text-[10px] outline-none border-none placeholder-gray-400"
//                   placeholder=""
//                 />
//               </div>
//             </div>

//             {/* Block 3 â€” bottom row */}
//             <div className="grid grid-cols-2 gap-[6px]">
//               {/* left half â€” Airport of Destination */}
//               <div className="relative h-7 border border-black flex items-end">
//                 <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
//                   Airport of Destination
//                 </span>
//                 <input
//                   id="destination-airport"
//                   className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
//                   placeholder="PVG - Pudong"
//                 />
//               </div>

//               {/* right half â€” Requested Flight/Date */}
//               <div className="relative h-7 border border-black flex items-end">
//                 <span className="absolute top-[1px] left-[2px] bg-white px-[1px] text-[6px] font-bold leading-none">
//                   Requested Flight/Date
//                 </span>
//                 <div className="grid grid-cols-2 w-full">
//                   <div className="flex items-end">
//                     <input
//                       id="requested-flight"
//                       className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
//                       placeholder="LH8402"
//                     />
//                   </div>
//                   <div className="flex items-end border-l border-black">
//                     <input
//                       id="requested-date"
//                       className="w-full text-[10px] font-black outline-none border-none placeholder-gray-400 text-gray-400"
//                       placeholder="/09"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* 1.2.4 -> fourth row right */}
//           {/* 1.2.4 â€” grid rows so total height always matches; Row 2 taller */}
//           <div className="p-1 min-h-0 grid grid-rows-[1fr_1.4fr_1fr] gap-[2px] overflow-hidden">
//             {/* Row 1 â€” 1.3 : 1 : 1 */}
//             <div className="grid grid-cols-[1.3fr_2fr] gap-[2px] min-h-0">
//               <div className="relative h-full border border-black flex flex-col justify-end min-w-0 px-1">
//                 {/* heading/label */}
//                 <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none bg-white px-[2px]">
//                   Reference Number
//                 </span>

//                 {/* input box */}
//                 <input
//                   id="shipment-referente-number"
//                   type="text"
//                   placeholder="123456"
//                   className="w-full text-[10px] font-bold outline-none border-none text-center placeholder-gray-400 text-gray-400"
//                 />
//               </div>

//               <div className="relative h-full border border-black flex flex-col justify-end min-w-0 px-1">
//                 {/* heading/label */}
//                 <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none bg-white px-[2px]">
//                   Optional Shipping Information
//                 </span>

//                 {/* input box */}
//                 <input
//                   id="shipment-referente-information"
//                   type="text"
//                   placeholder="123456"
//                   className="w-full text-[10px] font-bold outline-none border-none text-center placeholder-gray-400 text-gray-400"
//                 />
//               </div>
//             </div>

//             {/* Row 2 â€” 1.3 : 1 : 1 (taller via grid rows) */}
//             <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-[2px] min-h-0">
//               {/* LEFT SPLIT -> 4 cols (2 : 1.5 : 2.5 : 2.5) */}
//               <div className="grid grid-cols-[2fr_1.5fr_2.5fr_2.5fr] gap-[2px] min-h-0 min-w-0">
//                 {/* Currency */}
//                 <div className="relative h-full border border-black flex items-end px-1 min-w-0">
//                   <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                     Currency
//                   </span>
//                   <input
//                     id="currency"
//                     className="w-full text-[12px] font-black outline-none border-none placeholder-gray-400"
//                     placeholder="EUR"
//                   />
//                 </div>

//                 {/* CHGS */}
//                 <div className="relative h-full border border-black flex items-end px-1 min-w-0">
//                   <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                     CHGS
//                   </span>
//                   <input
//                     id="CHGS"
//                     className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
//                     placeholder="P"
//                   />
//                 </div>

//                 {/* WT/VAL */}
//                 <div className="grid grid-rows-[16px_1fr] h-full border border-black min-w-0">
//                   <div className="relative border-b border-black">
//                     <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                       WT/VAL
//                     </span>
//                   </div>
//                   <div className="grid grid-cols-2 min-h-0">
//                     <div className="border-r border-black grid grid-rows-[auto_1fr]">
//                       <div className="px-[2px] text-[6px] leading-none">
//                         PPD
//                       </div>
//                       <div className="border-t border-black flex items-center px-[2px]">
//                         <input
//                           id="wt_val_ppd_mark"
//                           className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
//                           placeholder="X"
//                         />
//                       </div>
//                     </div>
//                     <div className="grid grid-rows-[auto_1fr]">
//                       <div className="px-[2px] text-[6px] leading-none">
//                         COLL
//                       </div>
//                       <div className="border-t border-black flex items-center px-[2px]">
//                         <input
//                           id="wt_val_coll_mark"
//                           className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Other */}
//                 <div className="grid grid-rows-[16px_1fr] h-full border border-black min-w-0">
//                   <div className="relative border-b border-black">
//                     <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                       Other
//                     </span>
//                   </div>
//                   <div className="grid grid-cols-2 min-h-0">
//                     <div className="border-r border-black grid grid-rows-[auto_1fr]">
//                       <div className="px-[2px] text-[6px] leading-none">
//                         PPD
//                       </div>
//                       <div className="border-t border-black flex items-center px-[2px]">
//                         <input
//                           id="other_ppd_mark"
//                           className="w-full text-[10px] text-center outline-none border-none placeholder-gray-400 text-gray-400"
//                           placeholder="X"
//                         />
//                       </div>
//                     </div>
//                     <div className="grid grid-rows-[auto_1fr]">
//                       <div className="px-[2px] text-[6px] leading-none">
//                         COLL
//                       </div>
//                       <div className="border-t border-black flex items-center px-[2px]">
//                         <input
//                           id="other_coll_mark"
//                           className="w-full text-[10px] text-center outline-none border-none"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Declared Value for Carriage */}
//               <div className="relative h-full border border-black flex items-end px-1 min-w-0">
//                 <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                   Declared Value for Carriage
//                 </span>
//                 <input
//                   id="value-for-carriage"
//                   className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
//                   placeholder="NVD"
//                 />
//               </div>

//               {/* Declared Value for Customs */}
//               <div className="relative h-full border border-black flex items-end px-1 min-w-0">
//                 <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                   Declared Value for Customs
//                 </span>
//                 <input
//                   id="value-for-customs"
//                   className="w-full text-[12px] font-black outline-none border-none text-center placeholder-gray-400 text-gray-400"
//                   placeholder="NCV"
//                 />
//               </div>
//             </div>

//             {/* Row 3 â€” 1 : 2 */}
//             <div className="grid grid-cols-[1fr_2fr] gap-[2px] min-h-0">
//               <div className="relative h-full border border-black flex items-end px-1 min-w-0">
//                 <span className="absolute top-[1px] left-[2px] text-[6px] font-bold leading-none">
//                   Amount of Insurance
//                 </span>
//                 <input
//                   id="amount-of-insurance"
//                   className="w-full text-[12px] font-black outline-none border-none placeholder-gray-400"
//                   placeholder="XXX"
//                 />
//               </div>

//               <div className="border border-black min-w-0">
//                 <div className="relative h-full">
//                   <div className="absolute inset-x-[2px] bottom-[2px] top-[14px] text-[7px] leading-tight overflow-hidden">
//                     INSURANCE: If Carrier offers Insurance, and such insurance
//                     is requested in accordance with the conditions thereof,
//                     indicate amount to be insured in figures in box marked
//                     â€˜Amount of Insuranceâ€™.
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* SECTION 2 (30% height) */}
//         {/* SECTION 2 (30% height) */}
//         <div className="h-[30%] border-b border-black flex flex-col">
//           {/* === TOP BLOCK: Handling / Special / Other (labels + textareas) === */}
//           <div className="flex border-b border-black">
//             {/* Handling Information (left) */}
//             <div className="flex flex-col border-r border-black basis-[40%]">
//               <div className="h-5 text-[7px] font-bold flex items-center px-1">
//                 Handling Information
//               </div>
//               <input
//                 id="handling-information"
//                 className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400"
//                 placeholder="PLS NOTIFY CONSIGNEE IMMEDIATELY UPON ARRIVAL"
//               />
//             </div>

//             {/* Special Handling Codes (middle) */}
//             <div className="flex flex-col border-r border-black basis-[30%]">
//               <div className="h-5 text-[7px] font-bold flex items-center px-1">
//                 Special Handling Codes
//               </div>
//               <input
//                 id="special-handling-codes"
//                 className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
//                 placeholder={`ICE PAS FRO
// PIL REQ EAW`}
//               />
//             </div>

//             {/* Other Customs Information (right) */}
//             <div className="flex flex-col flex-1">
//               <div className="h-5 text-[7px] font-bold flex items-center px-1">
//                 Other Customs Information
//               </div>
//               <input
//                 id="other-customs-information"
//                 className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
//                 placeholder={`CN/CNE/CP/MR. WANG
// CN/CNE/CP/00 13023194906
// DE/SHP/CP/0049621759...  X`}
//               />
//             </div>
//           </div>

//           {/* === BOTTOM BLOCK: Charges table with footer strip === */}
//           <div className="flex-1 grid grid-rows-[1fr_18px]">
//             {/* TOP ROW (table body) */}
//             <div className="grid grid-cols-[1fr_2fr_0.5fr_2fr_2fr_2fr_3fr_6fr]">
//               {/* Col 1 â€” No. of Pieces */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   No. of Pieces RCP
//                 </div>
//                 <input
//                   id="pieces"
//                   className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
//                   placeholder="1"
//                 />
//               </div>

//               {/* Col 2 â€” Gross Weight */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   Gross Weight
//                 </div>
//                 <input
//                   id="gross-weight"
//                   className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
//                   placeholder="12"
//                 />
//               </div>

//               {/* Col 3 â€” KG / lb */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   KG / lb
//                 </div>
//                 <div className="flex-1 grid grid-rows-2">
//                   <input
//                     id="weight-unit"
//                     className="w-full text-center text-[8px] outline-none border-none leading-tight placeholder-gray-400 text-gray-400"
//                     placeholder="KG"
//                   />
//                 </div>
//               </div>

//               {/* Col 4 â€” Rate Class (1 : 4 with Commodity Item No. split into 2 inputs) */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 text-[7px] font-bold flex items-center justify-center text-center">
//                   Rate Class
//                 </div>
//                 <div className="flex-1 grid grid-cols-[1fr_4fr] min-h-0">
//                   {/* left: rate class code */}
//                   <input
//                     id="rate-class-code"
//                     className="border-r border-black w-full text-center text-[11px] font-bold outline-none border-none placeholder-gray-400 text-gray-400"
//                     placeholder="M"
//                   />
//                   {/* right: commodity item no. (top label + two inputs) */}
//                   <div className="grid grid-rows-[14px_1fr] min-h-0 border-l border-black">
//                     <div className="border-t border-b border-black text-[6px] flex items-center justify-center">
//                       Commodity Item No.
//                     </div>
//                     <div className="grid grid-cols-2 h-full">
//                       <input
//                         id="rate_class_value"
//                         className="w-full text-[10px] outline-none border-none text-center"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Col 5 â€” Chargeable Weight */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   Chargeable Weight
//                 </div>
//                 <input
//                   id="chargeable-weight"
//                   className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
//                   placeholder="15"
//                 />
//               </div>

//               {/* Col 6 â€” Rate / Charge */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   Rate / Charge
//                 </div>
//                 <input
//                   id="rate-charge"
//                   className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
//                   placeholder="145.00"
//                 />
//               </div>

//               {/* Col 7 â€” Total */}
//               <div className="flex flex-col border-r border-black">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   Total
//                 </div>
//                 <input
//                   id="total"
//                   className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
//                   placeholder="145.00"
//                 />
//               </div>

//               {/* Col 8 â€” Nature & Quantity of Goods */}
//               <div className="flex flex-col">
//                 <div className="h-6 border-b border-black text-[7px] font-bold flex items-center justify-center text-center">
//                   Nature and Quantity of Goods (incl. Dimensions or Volume)
//                 </div>
//                 <textarea
//                   id="nature-and-quantity-of-goods"
//                   className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400"
//                   placeholder={`PHARMACEUTICALS
// ENTRECTINIB IMPURITY REFERENCE STANDARD,
// DANGEROUS GOODS IN EXCEPTED QUANTITIES
// UN1845 DRY ICE
// 1 X 8 KG
// 1/39x39x60 cms
// HS Code: 29349900
// ECD: ART.137 UZK-DA`}
//                 />
//               </div>
//             </div>

//             {/* BOTTOM STRIP (small row across, inputs only in 1,2,7) */}
//             <div className="grid grid-cols-[1fr_2fr_0.5fr_2fr_2fr_2fr_3fr_6fr]">
//               <div className="border-t border-r border-black">
//                 <input
//                   id="pieces_value_total"
//                   className="w-full h-full text-[10px] leading-none outline-none border-none pl-1 placeholder-gray-400 text-gray-400"
//                   placeholder="1"
//                 />
//               </div>
//               <div className="border-t border-r border-black">
//                 <input
//                   id="gross_weight_total"
//                   className="w-full h-full text-[10px] leading-none outline-none border-none pl-1 placeholder-gray-400 text-gray-400"
//                   placeholder="12"
//                 />
//               </div>
//               <div className="border-t border-r border-black" />
//               <div className="border-t border-r border-black" />
//               <div className="border-t border-r border-black" />
//               <div className="border-t border-r border-black" />
//               <div className="border-t border-r border-black">
//                 <input
//                   id="total_final_value"
//                   className="w-full h-full text-[10px] leading-none outline-none border-none pr-1 text-right font-bold placeholder-gray-400 text-gray-400"
//                   placeholder="145.00"
//                 />
//               </div>
//               <div className="border-t border-black" />
//             </div>
//           </div>
//         </div>

//         {/* SECTION 3 (30% height) */}
//         {/* SECTION 3 â€” fills remaining space exactly */}
//         {/* SECTION 3 â€” exactly 3 rows, each 2 cols (1 : 1.5) */}
//         <div className="flex-1 min-h-0 border-b border-black grid grid-rows-3">
//           {/* ===== Row 1 ===== */}
//           <div className="grid grid-cols-[1fr_1.5fr] border-b border-black min-h-0">
//             {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
//             <div className="border-r border-black grid grid-rows-3 min-h-0">
//               {/* === Sub-row A === */}
//               <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
//                 {/* header (1) */}
//                 <div className="border-b border-black grid grid-cols-[1fr_2fr_1fr] text-[7px] font-bold">
//                   {/* Left col */}
//                   <div className="flex items-center justify-center border-r border-black">
//                     Prepaid
//                   </div>
//                   {/* Middle col */}
//                   <div className="flex items-center justify-center border-r border-black">
//                     Weight Charge
//                   </div>
//                   {/* Right col */}
//                   <div className="flex items-center justify-center">
//                     Collect
//                   </div>
//                 </div>

//                 {/* body (3) */}
//                 <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
//                   {/* Left half */}
//                   <div className="border-r border-black p-[2px]">
//                     <input
//                       id="Weight-charge-prepaid"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                   {/* Right half */}
//                   <div className="p-[2px]">
//                     <input
//                       id="Weight-charge-collect"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row B === */}
//               <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
//                 {/* header (1) */}
//                 <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                   Valuation Charges
//                 </div>
//                 {/* body (3) */}
//                 {/* body (3) */}
//                 <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
//                   {/* Left half */}
//                   <div className="border-r border-black p-[2px]">
//                     <input
//                       id="valuation_prepaid"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                   {/* Right half */}
//                   <div className="p-[2px]">
//                     <input
//                       id="valuation_collect"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row C === */}
//               <div className="grid grid-rows-[1fr_3fr] min-h-0">
//                 {/* header (1) */}
//                 <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                   Tax
//                 </div>
//                 {/* body (3) */}
//                 {/* body (3) */}
//                 <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
//                   {/* Left half */}
//                   <div className="border-r border-black p-[2px]">
//                     <input
//                       id="tax-prepaid"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                   {/* Right half */}
//                   <div className="p-[2px]">
//                     <input
//                       id="tax-collect"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* RIGHT */}
//             <div className="flex flex-col min-h-0">
//               <div className="h-5 text-[7px] font-bold flex items-center px-1">
//                 Other Charges
//               </div>
//               <textarea
//                 id="charges-declaration-other"
//                 className="flex-1 resize-none outline-none border-none text-[9px] leading-tight p-[2px] placeholder-gray-400 text-gray-400"
//                 placeholder={`MR-Airfreight Surcharge C 12.75
// RA-Dangerous Goods Fee C 60.00`}
//               />
//             </div>
//           </div>

//           {/* ===== Row 2 ===== */}
//           <div className="grid grid-cols-[1fr_1.5fr] border-b border-black min-h-0">
//             {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
//             <div className="border-r border-black grid grid-rows-3 min-h-0">
//               {/* === Sub-row A === */}
//               <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
//                 <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                   Total Other charges Due agent
//                 </div>
//                 {/* body (3) */}
//                 <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
//                   {/* Left half */}
//                   <div className="border-r border-black p-[2px]">
//                     <input
//                       id="total_other_charges_due_agent_prepaid"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                   {/* Right half */}
//                   <div className="p-[2px]">
//                     <input
//                       id="total_other_charges_due_agent_collect"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row B === */}
//               <div className="grid grid-rows-[1fr_3fr] border-b border-black min-h-0">
//                 <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                   Total Other charges Due Carrier
//                 </div>
//                 <div className="grid grid-cols-2 gap-[2px] text-[8px] leading-tight">
//                   <div className="border-r border-black p-[2px]">
//                     <input
//                       id="total_other_charges_due_carrier_prepaid"
//                       type="text"
//                       placeholder="72.75"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                   <div className="p-[2px]">
//                     <input
//                       id="total_other_charges_due_carrier_collect"
//                       type="text"
//                       placeholder="EUR"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row C === */}
//               <div className="grid grid-cols-2 border-b border-black min-h-0">
//                 <div className="border-r border-black p-[2px]">
//                   <input
//                     type="text"
//                     placeholder="217.75"
//                     className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                   />
//                 </div>
//                 <div className="p-[2px]">
//                   <input
//                     type="text"
//                     placeholder="Signature"
//                     className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* RIGHT */}
//             <div className="flex flex-col min-h-0">
//               {/* body */}
//               <div className="flex-1 flex flex-col p-[2px]">
//                 {/* paragraph */}
//                 <p className="text-[8px] leading-tight">
//                   Shipper certifies that the particulars on the face hereof are
//                   correct and that insofar as any part of the consignment
//                   contains dangerous goods, such part is properly described by
//                   name and is in proper condition for carriage by air according
//                   to the applicable Dangerous Goods Regulations
//                 </p>

//                 {/* spacer grows so the signature sits toward the bottom, like the form */}
//                 <div className="flex-1" />

//                 {/* signature line block */}
//                 <div className="flex flex-col items-center mt-4">
//                   {/* input centered above line */}
//                   <input
//                     type="text"
//                     id="shipper-certification-signature"
//                     placeholder=""
//                     className="text-[10px] font-black tracking-wide text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
//                   />

//                   {/* short dotted line */}
//                   <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />

//                   {/* caption */}
//                   <div className="text-center text-[7px] mt-1">
//                     Signature of Shipper or his Agent
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ===== Row 3 ===== */}
//           <div className="grid grid-cols-[1fr_1.5fr] min-h-0">
//             {/* LEFT: 3 sub-rows; each has 2 vertical parts in 1:3 ratio */}
//             <div className="border-r border-black grid grid-rows-3 min-h-0">
//               {/* === Sub-row A === */}
//               <div className="grid grid-cols-2 border-b border-black min-h-0">
//                 {/* Left half */}
//                 <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     Total prepaid
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="total-prepaid"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>

//                 {/* Right half */}
//                 <div className="grid grid-rows-[1fr_3fr] min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     Total Collect
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="total-collected"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row B === */}
//               <div className="grid grid-cols-2 border-b border-black min-h-0">
//                 {/* Left half */}
//                 <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     Currency Conversion rates
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="currency_conversion_rates"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>

//                 {/* Right half */}
//                 <div className="grid grid-rows-[1fr_3fr] min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     CC. Charges in Dest. Currency
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="cc_charges_in_dest_currency"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* === Sub-row C === */}
//               <div className="grid grid-cols-2 border-b border-black min-h-0">
//                 {/* Left half */}
//                 <div className="grid grid-rows-[1fr_3fr] border-r border-black min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     For Carreir&apos;s use only at Distination
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="for_carrier_use_only_at_destination"
//                       type="text"
//                       placeholder="123.45"
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>

//                 {/* Right half */}
//                 <div className="grid grid-rows-[1fr_3fr] min-h-0">
//                   {/* header */}
//                   <div className="border-b border-black flex items-center justify-center text-[7px] font-bold">
//                     Charges at Distination
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px]">
//                     <input
//                       id="charges_at_destination"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* RIGHT */}
//             <div className="grid grid-rows-[2fr_1fr] min-h-0">
//               {/* Row 1: now with a top bar + two stacked sub-rows */}
//               <div className="grid grid-rows-[auto_1fr_auto] border-b border-black min-h-0">
//                 {/* NEW top row â€” Print Time */}
//                 <div className="flex items-center px-2 py-1 gap-2 text-[9px] font-bold">
//                   <label className="shrink-0">Print Time:</label>
//                   <input
//                     id="print_time"
//                     type="text"
//                     placeholder="8/8/2025 10:43:22 AM"
//                     className="flex-1 border border-black px-1 py-0.5 outline-none text-[9px] font-normal placeholder-gray-400 text-gray-400"
//                   />
//                 </div>

//                 {/* Middle row â€” three fields with dotted lines */}
//                 <div className="grid grid-cols-3 gap-2 items-end px-2">
//                   {/* Executed on (Date) */}
//                   <div className="flex flex-col items-center">
//                     <input
//                       id="executed_on_date"
//                       type="text"
//                       placeholder="08-AUG-25"
//                       className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
//                     />
//                     <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
//                   </div>

//                   {/* at (Place) */}
//                   <div className="flex flex-col items-center">
//                     <input
//                       id="executed_on_place"
//                       type="text"
//                       placeholder=""
//                       className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
//                     />
//                     <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
//                   </div>

//                   {/* Signature */}
//                   <div className="flex flex-col items-center">
//                     <input
//                       id="executed_on_signature"
//                       type="text"
//                       placeholder="DSCHNEIDER"
//                       className="text-[10px] font-black text-center outline-none border-none bg-transparent placeholder-gray-400 text-gray-400"
//                     />
//                     <div className="w-2/3 border-t-2 border-black border-dotted mt-1" />
//                   </div>
//                 </div>

//                 {/* Bottom row â€” captions */}
//                 <div className="grid grid-cols-3 text-[7px] text-center leading-tight px-2 pb-1">
//                   <div>Executed on (Date)</div>
//                   <div>at (Place)</div>
//                   <div>Signature of Issuing Carrier or his Agent</div>
//                 </div>
//               </div>

//               {/* ===== Row 2 ===== */}
//               <div className="grid grid-cols-[1fr_2fr] border-b border-black min-h-0">
//                 {/* LEFT â€” compact header/body with borders */}
//                 <div className="border-r border-black grid grid-rows-[12px_1fr] min-h-0">
//                   {/* header (shorter height) */}
//                   <div className="border-b border-black flex items-center justify-center text-[6px] font-bold leading-none">
//                     Total Collect Charges
//                   </div>
//                   {/* body */}
//                   <div className="p-[2px] h-full">
//                     <input
//                       id="total_collect_charges"
//                       type="text"
//                       placeholder=""
//                       className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                     />
//                   </div>
//                 </div>

//                 {/* RIGHT column */}
//                 <div className="flex items-center justify-center text-[9px]">
//                   <input
//                     id="awb_number_end"
//                     type="text"
//                     placeholder="020 - 33153610"
//                     className="w-full h-full outline-none border-none text-[9px] text-center placeholder-gray-400 text-gray-400"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Actions: Save and Generate with enhanced styling */}
//       <div className="w-[210mm] mt-6 flex justify-center gap-4">
//         <button
//           type="button"
//           onClick={handleSaveDraft}
//           className="inline-flex items-center justify-center gap-2 w-44 md:w-48 h-11 rounded-full bg-transparent text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/40 dark:ring-emerald-400/40 hover:ring-emerald-500/60 dark:hover:ring-emerald-400/60 shadow-[0_2px_14px_rgba(16,185,129,0.15)] dark:shadow-[0_2px_14px_rgba(52,211,153,0.12)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.25)] dark:hover:shadow-[0_4px_20px_rgba(52,211,153,0.20)] transition-all duration-200 font-semibold"
//         >
//           Save as Draft
//         </button>
//         <button
//           type="button"
//           onClick={handleGenerateFromForm}
//           className="inline-flex items-center justify-center gap-2 w-44 md:w-48 h-11 rounded-full bg-transparent text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/40 dark:ring-rose-400/40 hover:ring-rose-500/60 dark:hover:ring-rose-400/60 shadow-[0_2px_14px_rgba(239,68,68,0.15)] dark:shadow-[0_2px_14px_rgba(248,113,113,0.12)] hover:shadow-[0_4px_20px_rgba(239,68,68,0.25)] dark:hover:shadow-[0_4px_20px_rgba(248,113,113,0.20)] transition-all duration-200 font-semibold"
//         >
//           Export Final PDF
//         </button>
//       </div>

//       {/* âœ… Custom Colored Popup */}
//       {popup.visible && (
//         <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
//           <div
//             className={`rounded-2xl shadow-2xl bg-white border-t-4 ${
//               popup.color === "rose"
//                 ? "border-rose-500"
//                 : popup.color === "amber"
//                 ? "border-amber-400"
//                 : "border-blue-500"
//             } w-[380px] max-w-[90%] p-6 text-center`}
//           >
//             <h2
//               className={`text-xl font-bold mb-2 ${
//                 popup.color === "rose"
//                   ? "text-rose-600"
//                   : popup.color === "amber"
//                   ? "text-amber-500"
//                   : "text-blue-600"
//               }`}
//             >
//               {popup.title}
//             </h2>
//             <p className="text-gray-700 mb-6">{popup.message}</p>
//             <button
//               onClick={() =>
//                 setPopup({
//                   visible: false,
//                   title: "",
//                   message: "",
//                   color: "emerald",
//                 })
//               }
//               className={`px-6 py-2 rounded-full text-white font-semibold shadow-md ${
//                 popup.color === "rose"
//                   ? "bg-rose-600 hover:bg-rose-700"
//                   : popup.color === "amber"
//                   ? "bg-amber-500 hover:bg-amber-600"
//                   : "bg-blue-600 hover:bg-blue-700"
//               } transition-all duration-200`}
//             >
//               OK
//             </button>
//           </div>
//         </div>
//       )}
//     </main>
    
//   );
// }

// export default function AwbForm(props: { data?: AwbPayload | null }) {
//   return (
//     <Suspense
//       fallback={
//         <div className="p-10 text-center text-gray-400">Loading form...</div>
//       }
//     >
//       <AwbFormInner {...props} />
//     </Suspense>
//   );
// }


// "use client";
// import React, { useEffect, useState } from "react";
// import { useAuth } from "../../context/AuthContext";
// import { useCompany } from "../../context/CompanyContext";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Geist, Geist_Mono } from "next/font/google";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// type AwbPayload = Record<string, unknown>;
// type ElementWithDataset = (
//   | HTMLInputElement
//   | HTMLTextAreaElement
//   | HTMLSelectElement
// ) & {
//   dataset: DOMStringMap & { listenerAttached?: string; userTouched?: string };
// };



// // export default function AwbForm({ data }: { data?: Record<string, any> | null }) {
// export default function AwbForm({ data }: { data?: AwbPayload | null }) {
//   const { user } = useAuth();
//   const { selectedCompanyId } = useCompany();
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [generating, setGenerating] = useState(false);

"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function useAuth() {
  return { user: { id: "preview-user" } };
}

function useCompany() {
  return {
    selectedCompanyId: "",
    setSelectedCompanyId: (companyId: string, persist?: boolean) => {
      void companyId;
      void persist;
    },
  };
}

type AwbPayload = Record<string, unknown>;
type ElementWithDataset = (
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
) & {
  dataset: DOMStringMap & { listenerAttached?: string; userTouched?: string };
};

// --- Inner Component ---
// function AwbFormInner({ data }: { data?: AwbPayload | null }) 

function AwbFormInner({
  data,
  onPdfGenerated,
  onSaveDraft,
  onExportFinalPdf,
  onFieldChange,
  savingDraft = false,
  exportingPdf = false,
  showActions = true,
}: {
  data?: AwbPayload | null;
  onPdfGenerated?: (url: string) => void;
  onSaveDraft?: () => void;
  onExportFinalPdf?: () => void;
  onFieldChange?: (payloadKey: string, value: string) => void;
  savingDraft?: boolean;
  exportingPdf?: boolean;
  showActions?: boolean;
}) 
  {
  const { user } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  const router = useRouter();
  const searchParams = useSearchParams(); // âœ… still here, but safe inside Suspense
  const formRef = useRef<HTMLElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloadStep, setDownloadStep] = useState("Preparing secure AWB draft");
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

    resetFormInputsAndVisuals();

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
      "requested-date": ["flight_date", "Requested Flight Date"],
      // Reference numbers
      "shipment-referente-number": ["reference_number", "Shipment referente number"],
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
      "gross-weight": ["gross_weight", "Gross weight"],
      "chargeable-weight": ["chargeable_weight", "Chargeable weight"],
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
      "executed_on_date": ["exec_date"],
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
        return { value, confidence, needReview };
      }
      return { value: raw, confidence: null, needReview: false };
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
      needReview: boolean
    ) {
      const el = formElement.querySelector<HTMLElement>(`[id="${id}"]`);
      if (!el || !el.parentElement) return;
      const container = el.parentElement as HTMLElement;

      const isGreen =
        confidence != null && confidence > 0.95 && needReview === false;
      const isYellow =
        confidence != null &&
        confidence < 0.95 &&
        confidence > 0.85 &&
        needReview === false;

      const color = isGreen
        ? "rgba(236, 253, 245, 0.8)"
        : isYellow
        ? "rgba(254, 252, 232, 0.8)"
        : "rgba(255, 241, 242, 0.8)";
      container.style.backgroundColor = color;
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
        if (event.isTrusted && onFieldChange) {
          onFieldChange(payloadKey, el.value);
        }
      };
      el.addEventListener("input", handleMappedInput);
      listenerCleanups.push(() => el.removeEventListener("input", handleMappedInput));

      const { value, confidence, needReview } = extractValueAndConfidence(raw);
      const str = value == null ? "" : String(value).trim();
      if (str.toLowerCase() === "none") {
        (el as HTMLElement).style.color = "#000";
        el.value = "";
        applyConfidenceTintById(id, confidence, needReview);
        continue;
      }

      const before = el.value ?? "";
      setElementValueById(id, str);
      const after = el.value ?? "";
      if (after && after !== before) {
        filledSubset[id] = after;
        applyConfidenceTintById(id, confidence, needReview);
      }
    }

    (
      window as unknown as { __AWB_AUTO_FILLED__?: Record<string, unknown> }
    ).__AWB_AUTO_FILLED__ = filledSubset;
    return () => listenerCleanups.forEach((cleanup) => cleanup());
  }, [data, onFieldChange]);

  async function handleGenerateFromForm() {
    setGenerating(true);
    setDownloadStep("Preparing secure AWB draft");
    // New field mapping for the external API endpoint
    const outgoingMap: Record<string, string> = {
      "shipper-name-address": "shipper_address",
      "input-shipper-account-no": "shipper_account",
      "shipper-phone-number": "shipper_phone",
      "issued-by": "issued_by",
      "consignee-phone-number": "consignee_phone",
      "consignee-account-number": "consignee_account",
      "consignee-name-address": "consignee_address",
      "issuing-carrier-agent-name-and-city": "issuing_agent_name_city",
      "issuing-carrier-agent-iata-code": "agent_iata_code",
      "issuing-carrier-agent-account-no": "agent_account_no",
      "accounting-information-details": "accounting_information",
      "routing-and-destination": "routing_to",
      "by-first-carrier": "by_first_carrier",
      "destination-airport": "airport_destination",
      "departure-airport": "airport_departure",
      "requested-flight": "flight_no",
      "requested-date": "flight_date",
      "shipment-referente-number": "reference_number",
      "shipment-referente-information": "reference_number2",
      "currency": "currency_value",
      "CHGS": "chgs_value",
      "wt_val_ppd_mark": "wt_val_ppd_mark",
      "wt_val_coll_mark": "wt_val_coll_mark",
      "other_ppd_mark": "other_ppd_mark",
      "other_coll_mark": "other_coll_mark",
      "value-for-carriage": "declared_carriage",
      "value-for-customs": "declared_customs",
      "amount-of-insurance": "insurance_amount",
      "handling-information": "handling_info",
      "special-handling-codes": "special_codes",
      "other-customs-information": "other_customs_info",
      "pieces": "pieces_value",
      "pieces_value_total": "pieces_value_total",
      "gross-weight": "gross_weight",
      "gross_weight_total": "gross_weight_total",
      "weight-unit": "weight_unit",
      "rate-class-code": "rate_class_value_side_left",
      "rate_class_value": "rate_class_value",
      "chargeable-weight": "chargeable_weight",
      "rate-charge": "rate_charge_value",
      "total": "total_value",
      "total_final_value": "total_final_value",
      "nature-and-quantity-of-goods": "goods_description",
      "Weight-charge-prepaid": "weight_charge_prepaid",
      "Weight-charge-collect": "weight_charge_collect",
      "valuation_prepaid": "valuation_prepaid",
      "valuation_collect": "valuation_collect",
      "tax-prepaid": "tax_prepaid",
      "tax-collect": "tax_collect",
      "charges-declaration-other": "other_charges",
      "total_other_charges_due_agent_prepaid": "total_other_charges_due_agent_prepaid",
      "total_other_charges_due_agent_collect": "total_other_charges_due_agent_collect",
      "shipper-certification-signature": "shipper_signature",
      "total_other_charges_due_carrier_prepaid": "total_other_charges_due_carrier_prepaid",
      "total_other_charges_due_carrier_collect": "total_other_charges_due_carrier_collect",
      "total-prepaid": "total_prepaid_value",
      "total-collected": "total_collect_value",
      "currency_conversion_rates": "currency_conversion_rates",
      "cc_charges_in_dest_currency": "cc_charges_in_dest_currency",
      "for_carrier_use_only_at_destination": "for_carriers_use_only_at_destination",
      "charges_at_destination": "charges_at_destination",
      "print_time": "print_time_value",
      "executed_on_date": "exec_date",
      "executed_on_place": "exec_place",
      "executed_on_signature": "exec_signature",
      "total_collect_charges": "total_collect_charges"
    };

    // const payload: Record<string, any> = {};
    const payload: Record<string, unknown> = {};

    // Collect all form values according to the mapping
    for (const [id, key] of Object.entries(outgoingMap)) {
      const el = document.getElementById(id) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | HTMLElement
        | null;
      
      let val = "";
      if (el) {
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        ) {
          val = el.value ?? "";
        } else {
          val = (el.textContent ?? "").trim();
        }
      }
      
      // Always include the field, even if empty
      payload[key] = val;
    }

    // Add fields that should be empty strings (marked as empty in mappings)
    payload["routing_to2"] = "";
    payload["routing_by1"] = "";
    payload["routing_to3"] = "";
    payload["routing_by2"] = "";
    payload["reference_number3"] = "";
    payload["SCI"] = "";
    payload["rate_charge_value_total"] = "";
    payload["total_volume"] = "";
    payload["awb_number_end"] = "";

    // Persist AWB + history to backend before generating PDF
    try {
      if (user?.id && selectedCompanyId) {
        // Console log the JSON payload being stored in database
        try {
          console.groupCollapsed("ðŸ’¾ [DATABASE SAVE] Preparing to save AWB data to database");
          console.log("ðŸ†” User ID:", user.id);
          console.log("ðŸ¢ Company ID:", selectedCompanyId);
          console.log("ðŸ“„ AWB ID (if updating):", searchParams.get("awb_id") || "Creating new");
          console.log("ðŸ”¢ Total payload fields:", Object.keys(payload).length);
          console.log("ðŸ“Š Payload field analysis:");
          const payloadAnalysis = Object.entries(payload).reduce((acc, [ value]) => {
            const type = typeof value;
            const isEmpty = !value || String(value).trim() === "";
            acc.types[type] = (acc.types[type] || 0) + 1;
            if (isEmpty) acc.empty++;
            else acc.filled++;
            return acc;
          }, { types: {} as Record<string, number>, empty: 0, filled: 0 });
          console.log("  Field types:", payloadAnalysis.types);
          console.log("  Filled fields:", payloadAnalysis.filled);
          console.log("  Empty fields:", payloadAnalysis.empty);
          console.log("ðŸ’¾ Complete payload object:", payload);
          console.log("ðŸ“ Payload JSON string:", JSON.stringify(payload, null, 2));
          console.log("ðŸŒ Full database request body:", JSON.stringify({
            companyId: selectedCompanyId,
            userId: user.id,
            payload,
            note: "Generated PDF",
            awbId: searchParams.get("awb_id") || undefined,
          }, null, 2));
          console.groupEnd();
        } catch (logError) {
          console.error("ðŸ’¥ [DATABASE SAVE] Failed to log database payload:", logError);
        }

        let procRes = await fetch("/api/awb/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            userId: user.id,
            payload,
            note: "Generated PDF",
            awbId: searchParams.get("awb_id") || undefined,
          }),
        });
        let procJson = await procRes
          .json()
          .catch(() => ({} as Record<string, unknown>));
        if (!procRes.ok) {
          // Fallback: if AWB id in URL is stale or missing, retry without awbId to create a new record
          if (
            procRes.status === 404 &&
            String(procJson?.error || "")
              .toLowerCase()
              .includes("awb not found")
          ) {
            try {
              console.warn(
                "[AWB Generate] AWB not found, retrying create without awbId"
              );
              procRes = await fetch("/api/awb/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  companyId: selectedCompanyId,
                  userId: user.id,
                  payload,
                  note: "Generated PDF",
                }),
              });
              procJson = await procRes
                .json()
                .catch(() => ({} as Record<string, unknown>));
            } catch (retryErr) {
              console.error("[AWB Generate] Retry failed", retryErr);
            }
          }
        }

        if (!procRes.ok) {
          console.error("AWB persist failed", procRes.status, procJson);
          alert(
            `Save failed (${procRes.status}). History not recorded. Error: ${
              procJson?.error || "unknown"
            }`
          );
        } else if (procJson?.awbId) {
          // Log successful database storage
          try {
            console.groupCollapsed("âœ… [DATABASE SAVE] Successfully saved AWB data to database");
            console.log("ðŸŽ‰ Operation successful!");
            console.log("ðŸ†” AWB ID:", procJson.awbId);
            console.log("ðŸ“Š Response status:", procRes.status);
            console.log("ðŸ’¾ Stored payload fields:", Object.keys(payload).length);
            console.log("ðŸ“„ Complete stored payload:", payload);
            console.log("ðŸŒ Full database response:", procJson);
            console.log("ðŸ“ Response JSON:", JSON.stringify(procJson, null, 2));
            console.groupEnd();
          } catch (logError) {
            console.error("ðŸ’¥ [DATABASE SAVE] Failed to log database success:", logError);
          }

          // Keep awb_id in the URL so returning to the page reloads saved data
          const params = new URLSearchParams(window.location.search);
          params.set("company_id", selectedCompanyId);
          params.set("awb_id", String(procJson.awbId));
          router.replace(`${window.location.pathname}?${params.toString()}`);

          // Attempt to assign/consume an AWB number and inject into payload
          try {
            console.log("ðŸ”¢ [AWB NUMBER] Attempting to assign AWB number", {
              awbId: procJson.awbId,
              userId: user.id,
            });
            const assignRes = await fetch("/api/awb/assign-number", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                awbId: procJson.awbId,
                userId: user.id,
                payload,
              }),
            });
            const assignJson = await assignRes
              .json()
              .catch(() => ({} as Record<string, unknown>));
            if (!assignRes.ok) {
              console.warn(
                "âš ï¸ [AWB NUMBER] Assignment failed",
                assignRes.status,
                assignJson
              );
            } else if (assignJson?.awb_number) {
              // Set both camelCase and spaced keys for compatibility
              payload["awbNumber"] = assignJson.awb_number;
              payload["AWB Number"] = assignJson.awb_number;
              console.log(
                "âœ… [AWB NUMBER] Successfully assigned AWB number:",
                assignJson.awb_number
              );
            } else {
              console.warn(
                "âš ï¸ [AWB NUMBER] Response received but no AWB number provided",
                assignJson
              );
            }
          } catch (e: unknown) {
            // catch (e: any) {
            //   console.error(
            //     "[AWB Generate] Assign-number error",
            //     e?.message || e
            //   );
            // }
            const err = e as { message?: string };
            console.error(
              "[AWB Generate] Assign-number error",
              err.message || e
            );
          }
        }
      }

      // Print payload before sending to new API (debug)
      try {
        console.groupCollapsed("[AWB Generate] Payload to new API endpoint");
        console.log(payload);
        console.log("JSON string:", JSON.stringify(payload, null, 2));
        console.groupEnd();
      } catch {}

      setDownloadStep("Generating polished PDF");

      const res = await fetch("https://semloxai.vercel.app/api/generate-awb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("Generate failed", res.status, txt);
        alert("Generate failed: " + res.status + " â€” check console.");
        setGenerating(false);
        return;
      }

      setDownloadStep("Finalizing download");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      onPdfGenerated?.(url);

      const a = document.createElement("a");
      a.href = url;
      // Use reference_number for filename (mapped from shipment-referente-number)
      const filenameCandidate = payload["reference_number"];
      const safeFilename =
        String(filenameCandidate || "awb")
          .replace(/[\\/:*?"<>|]+/g, "_")
          .trim() || "awb";
      a.download = `${safeFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1200);
      setDownloadStep("Download started");
      window.setTimeout(() => setGenerating(false), 450);
    } catch (e) {
      console.error(e);
      alert("Generate failed. Please try again.");
      setGenerating(false);
    }
  }

  // Retained for legacy standalone form compatibility; review-page actions use callbacks.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleSaveDraft() {
    await handleGenerateFromForm();
    return;

    // Build payload from current form inputs (same mapping as generate)
    const outgoingMap: Record<string, string> = {
      // Align draft payload keys to canonical snake_case used in Generate AWB
      "shipper-name-address": "shipper_address",
      "input-shipper-account-no": "shipper_account",
      "shipper-phone-number": "shipper_phone",
      "issued-by": "issued_by",
      "consignee-phone-number": "consignee_phone",
      "consignee-account-number": "consignee_account",
      "consignee-name-address": "consignee_address",
      "issuing-carrier-agent-name-and-city": "issuing_agent_name_city",
      "issuing-carrier-agent-iata-code": "agent_iata_code",
      "issuing-carrier-agent-account-no": "agent_account_no",
      "accounting-information-details": "accounting_information",
      "routing-and-destination": "routing_to",
      "by-first-carrier": "by_first_carrier",
      "destination-airport": "airport_destination",
      "departure-airport": "airport_departure",
      "requested-flight": "flight_no",
      "requested-date": "flight_date",
      "shipment-referente-number": "reference_number",
      "shipment-referente-information": "reference_number2",
      "currency": "currency_value",
      "CHGS": "chgs_value",
      "wt_val_ppd_mark": "wt_val_ppd_mark",
      "wt_val_coll_mark": "wt_val_coll_mark",
      "other_ppd_mark": "other_ppd_mark",
      "other_coll_mark": "other_coll_mark",
      "value-for-carriage": "declared_carriage",
      "value-for-customs": "declared_customs",
      "amount-of-insurance": "insurance_amount",
      "handling-information": "handling_info",
      "special-handling-codes": "special_codes",
      "other-customs-information": "other_customs_info",
      "pieces": "pieces_value",
      "pieces_value_total": "pieces_value_total",
      "gross-weight": "gross_weight",
      "gross_weight_total": "gross_weight_total",
      "weight-unit": "weight_unit",
      "rate-class-code": "rate_class_value_side_left",
      "rate_class_value": "rate_class_value",
      "chargeable-weight": "chargeable_weight",
      "rate-charge": "rate_charge_value",
      "total": "total_value",
      "total_final_value": "total_final_value",
      "nature-and-quantity-of-goods": "goods_description",
      "Weight-charge-prepaid": "weight_charge_prepaid",
      "Weight-charge-collect": "weight_charge_collect",
      "valuation_prepaid": "valuation_prepaid",
      "valuation_collect": "valuation_collect",
      "tax-prepaid": "tax_prepaid",
      "tax-collect": "tax_collect",
      "charges-declaration-other": "other_charges",
      "total_other_charges_due_agent_prepaid": "total_other_charges_due_agent_prepaid",
      "total_other_charges_due_agent_collect": "total_other_charges_due_agent_collect",
      "shipper-certification-signature": "shipper_signature",
      "total_other_charges_due_carrier_prepaid": "total_other_charges_due_carrier_prepaid",
      "total_other_charges_due_carrier_collect": "total_other_charges_due_carrier_collect",
      "total-prepaid": "total_prepaid_value",
      "total-collected": "total_collect_value",
      "currency_conversion_rates": "currency_conversion_rates",
      "cc_charges_in_dest_currency": "cc_charges_in_dest_currency",
      "for_carrier_use_only_at_destination": "for_carriers_use_only_at_destination",
      "charges_at_destination": "charges_at_destination",
      "print_time": "print_time_value",
      "executed_on_date": "exec_date",
      "executed_on_place": "exec_place",
      "executed_on_signature": "exec_signature",
      "total_collect_charges": "total_collect_charges",
    };

    // const payload: Record<string, any> = {};
    const payload: Record<string, unknown> = {};

    for (const [id, key] of Object.entries(outgoingMap)) {
      const el = document.getElementById(id) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | HTMLElement
        | null;
      let val = "";

      if (
        el &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        const fieldEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        val = fieldEl.value ?? "";
      } else {
        val = (el?.textContent ?? "").trim();
      }
      // Always include the field, even if empty, to keep payload shape consistent
      payload[key] = val;
    }

    // Add fields that should be empty strings (marked as empty in mappings)
    payload["routing_to2"] = "";
    payload["routing_by1"] = "";
    payload["routing_to3"] = "";
    payload["routing_by2"] = "";
    payload["reference_number3"] = "";
    payload["SCI"] = "";
    payload["rate_charge_value_total"] = "";
    payload["total_volume"] = "";
    payload["awb_number_end"] = "";

    try {
      if (user?.id && selectedCompanyId) {
        const procRes = await fetch("/api/awb/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            userId: user.id,
            payload,
            note: "Saved draft",
            awbId: searchParams.get("awb_id") || undefined,
          }),
        });
        const procJson = await procRes
          .json()
          .catch(() => ({} as Record<string, unknown>));
        if (!procRes.ok) {
          console.error("AWB save draft failed", procRes.status, procJson);
          alert(
            `Save draft failed (${procRes.status}). Error: ${
              procJson?.error || "unknown"
            }`
          );
          return;
        }
        if (procJson?.awbId) {
          const params = new URLSearchParams(window.location.search);
          params.set("company_id", selectedCompanyId);
          params.set("awb_id", String(procJson.awbId));
          try {
            localStorage.setItem("last_awb_id", String(procJson.awbId));
            try {
              setSelectedCompanyId(selectedCompanyId, true);
            } catch {}
          } catch {}
          router.replace(`${window.location.pathname}?${params.toString()}`);
        }
        // alert("Draft saved.");
        setPopup({
          visible: true,
          title: "âœ… Draft Saved",
          message: "Your draft has been saved successfully.",
          color: "emerald",
        });

      } else {
        alert("No user or company context available.");
      }
    } catch (e) {
      console.error(e);
      alert("Save draft failed â€” see console.");
    }
  }

  

  return (
    <main
      ref={formRef}
      className={`awb-form ${geistSans.variable} ${geistMono.variable} flex flex-col items-center bg-transparent px-0 py-0`}
    >
      {generating && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#050813]/75 backdrop-blur-md">
          <div className="w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/95 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
            <div className="h-1 bg-gradient-to-r from-[#2f80ff] via-[#00d9ff] to-[#14b8a6]" />
            <div className="flex flex-col items-center px-7 py-7 text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-[#2f80ff]/20 bg-[#2f80ff]/10" />
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[#1e3a5f] border-t-[#00d9ff]" />
                <div className="absolute h-3 w-3 rounded-full bg-[#00d9ff] shadow-[0_0_20px_rgba(0,217,255,0.85)]" />
              </div>
              <div className="text-[15px] font-extrabold tracking-[-0.02em] text-white">
                Preparing PDF Download
              </div>
              <div className="mt-2 min-h-5 font-mono text-[10px] text-[#00d9ff]">
                {downloadStep}
              </div>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#2f80ff] to-[#00d9ff]" />
              </div>
              <div className="mt-3 text-[10px] leading-relaxed text-[#64748b]">
                Please keep this tab open. Your AWB draft will download automatically.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* A4 sheet with enhanced styling */}
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
          {/* 1.1.4 â€” compact, labels inside boxes with 6px font */}
          <div className="p-1 border-r min-h-0 flex flex-col gap-[4px] overflow-hidden">
            {/* Block 1 â€” Airport of Departure */}
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

            {/* Block 2 â€” 1:4:1:1:1:1 with smaller label font */}
            <div className="grid grid-cols-[1fr_4fr_1fr_1fr_1fr_1fr] gap-[2px]">
              {/* col 1 â€” to */}
              <div className="relative h-8 border border-black flex items-end overflow-hidden"></div>
              {/* col 5 â€” to */}
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

              {/* col 6 â€” by */}
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

            {/* Block 3 â€” bottom row */}
            <div className="grid grid-cols-2 gap-[6px]">
              {/* left half â€” Airport of Destination */}
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

              {/* right half â€” Requested Flight/Date */}
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
          {/* 1.2.4 â€” grid rows so total height always matches; Row 2 taller */}
          <div className="p-1 min-h-0 grid grid-rows-[1fr_1.4fr_1fr] gap-[2px] overflow-hidden">
            {/* Row 1 â€” 1.3 : 1 : 1 */}
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

            {/* Row 2 â€” 1.3 : 1 : 1 (taller via grid rows) */}
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

            {/* Row 3 â€” 1 : 2 */}
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
            {/* TOP ROW (table body) */}
            <div className="grid grid-cols-[1fr_2fr_0.5fr_2fr_2fr_2fr_3fr_6fr]">
              {/* Col 1 â€” No. of Pieces */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  No. of Pieces RCP
                </div>
                <input
                  id="pieces"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
                  placeholder="1"
                />
              </div>

              {/* Col 2 â€” Gross Weight */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Gross Weight
                </div>
                <input
                  id="gross-weight"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400 text-gray-400"
                  placeholder="12"
                />
              </div>

              {/* Col 3 â€” KG / lb */}
              <div className="flex flex-col border-r border-black">
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
              </div>

              {/* Col 4 â€” Rate Class (1 : 4 with Commodity Item No. split into 2 inputs) */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Rate Class
                </div>
                <div className="flex-1 grid grid-cols-[1fr_4fr] min-h-0">
                  {/* left: rate class code */}
                  <input
                    id="rate-class-code"
                    className="border-r border-black w-full text-center text-[11px] font-bold outline-none border-none placeholder-gray-400 text-gray-400"
                    placeholder="M"
                  />
                  {/* right: commodity item no. (top label + two inputs) */}
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

              {/* Col 5 â€” Chargeable Weight */}
              <div className="flex flex-col border-r border-black">
                <div className="h-8 border-b border-black px-[1px] text-[6px] font-bold leading-tight flex items-center justify-center text-center overflow-hidden">
                  Chargeable Weight
                </div>
                <input
                  id="chargeable-weight"
                  className="flex-1 w-full text-center text-[11px] font-bold outline-none border-none p-[2px] placeholder-gray-400"
                  placeholder="15"
                />
              </div>

              {/* Col 6 â€” Rate / Charge */}
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

              {/* Col 7 â€” Total */}
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

              {/* Col 8 â€” Nature & Quantity of Goods */}
              <div className="flex flex-col">
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
              </div>
            </div>

            {/* BOTTOM STRIP (small row across, inputs only in 1,2,7) */}
            <div className="grid grid-cols-[1fr_2fr_0.5fr_2fr_2fr_2fr_3fr_6fr]">
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
        {/* SECTION 3 â€” fills remaining space exactly */}
        {/* SECTION 3 â€” exactly 3 rows, each 2 cols (1 : 1.5) */}
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
                {/* NEW top row â€” Print Time */}
                <div className="flex items-center px-2 py-1 gap-2 text-[9px] font-bold">
                  <label className="shrink-0">Print Time:</label>
                  <input
                    id="print_time"
                    type="text"
                    placeholder="8/8/2025 10:43:22 AM"
                    className="flex-1 border border-black px-1 py-0.5 outline-none text-[9px] font-normal placeholder-gray-400 text-gray-400"
                  />
                </div>

                {/* Middle row â€” three fields with dotted lines */}
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

                {/* Bottom row â€” captions */}
                <div className="grid grid-cols-3 text-[7px] text-center leading-tight px-2 pb-1">
                  <div>Executed on (Date)</div>
                  <div>at (Place)</div>
                  <div>Signature of Issuing Carrier or his Agent</div>
                </div>
              </div>

              {/* ===== Row 2 ===== */}
              <div className="grid grid-cols-[1fr_2fr] border-b border-black min-h-0">
                {/* LEFT â€” compact header/body with borders */}
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

