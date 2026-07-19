import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { buildAdminCurrentDifferences } from "../lib/admin/current-differences.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { isFieldDifferentFromAiOutput } from "../lib/admin/metrics.ts";
import type { AdminDocumentRow, AdminFieldRow } from "../lib/admin/server/repository.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
test("live Human Corrections reconciles raw, canonical, legacy and paginated totals", { skip: !url || !key }, async () => {
  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } }); const fields: AdminFieldRow[] = []; const documents: AdminDocumentRow[] = [];
  for (let from = 0; ; from += 1000) { const { data, error } = await client.from("awb_fields").select("id,document_id,key,label,value,original_value,confidence,needs_review,status,created_at,updated_at").order("id").range(from, from + 999); assert.ifError(error); fields.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break; }
  for (let from = 0; ; from += 1000) { const { data, error } = await client.from("awb_documents").select("id,file_name,status,run_id,processing_time_ms,created_at,updated_at").order("id").range(from, from + 999); assert.ifError(error); documents.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break; }
  const base = { page: 1, pageSize: 10, search: null, fieldKey: null, fieldStatus: null, documentStatus: null, needsReview: null, includeLegacy: false, sortBy: "fieldUpdatedAt" as const, sortOrder: "desc" as const };
  const first = buildAdminCurrentDifferences(fields, documents, base); const raw = fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value)).length;
  assert.equal(first.summary.rawDifferenceCount, raw); assert.equal(raw, first.summary.canonicalDifferenceCount + first.summary.legacyDifferenceCount); assert.ok(first.items.every((item) => item.isCurrentCanonicalField));
  let traversed = 0; for (let page = 1; page <= first.pagination.totalPages; page += 1) traversed += buildAdminCurrentDifferences(fields, documents, { ...base, page }).items.length;
  assert.equal(traversed, first.pagination.totalItems); assert.equal(first.summary.affectedDocumentCount, new Set(fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value) && first.fieldOptions.some((item) => item.key === field.key)).map((field) => field.document_id)).size);
  for (const item of first.items) assert.ok(item.confidence === null || item.confidence >= 0 && item.confidence <= 100);
});
