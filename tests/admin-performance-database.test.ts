import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { buildAdminPerformance, buildAdminPerformanceDocumentList, processingSeconds } from "../lib/admin/performance.ts";
import type { AdminDocumentRow, AdminFieldRow } from "../lib/admin/server/repository.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
test("live Performance reconciles with Overview and Document Audit", { skip: !url || !key }, async () => {
  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } }); const documents: AdminDocumentRow[] = []; const fields: AdminFieldRow[] = [];
  for (let from = 0; ; from += 1000) { const { data, error } = await client.from("awb_documents").select("id,file_name,status,run_id,processing_time_ms,created_at,updated_at").order("id").range(from, from + 999); assert.ifError(error); documents.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break; }
  for (let from = 0; ; from += 1000) { const { data, error } = await client.from("awb_fields").select("id,document_id,key,label,value,original_value,confidence,needs_review,status,created_at,updated_at").order("id").range(from, from + 999); assert.ifError(error); fields.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break; }
  const result = buildAdminPerformance(documents, fields); const valid = documents.filter((document) => processingSeconds(document.processing_time_ms) !== null); const failed = documents.filter((document) => document.status === "failed");
  assert.equal(result.summary.validProcessingSampleCount, valid.length); assert.equal(result.summary.failedDocumentCount, failed.length); assert.equal(result.processingDistribution.reduce((sum, bucket) => sum + bucket.count, 0), valid.length);
  assert.equal([...new Set(documents.map((document) => document.id))].length, documents.length);
  assert.equal(documents.filter((document) => ["failed", "draft", "issued", "review_required"].includes(document.status)).length, documents.length);
  const slow = valid.sort((a, b) => Number(b.processing_time_ms) - Number(a.processing_time_ms)); const query = { type: "slow" as const, page: 1, pageSize: 10, search: null, sortBy: "processingTime" as const, sortOrder: "desc" as const }; let traversed = 0;
  for (let page = 1; page <= Math.ceil(slow.length / 10); page += 1) traversed += buildAdminPerformanceDocumentList(slow.slice((page - 1) * 10, page * 10), fields, slow.length, { ...query, page }).items.length;
  assert.equal(traversed, slow.length);
  for (let index = 1; index < slow.length; index += 1) assert.ok(Number(slow[index - 1].processing_time_ms) >= Number(slow[index].processing_time_ms));
  assert.ok(failed.every((document) => document.status === "failed"));
});
