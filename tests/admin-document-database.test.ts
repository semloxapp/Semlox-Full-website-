import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { isFieldDifferentFromAiOutput, validConfidencePercentages, validProcessingTimes } from "../lib/admin/metrics.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("live paginated Document Audit traversal reconciles with Overview", { skip: !url || !serviceKey }, async () => {
  const client = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const documents: Array<{ id: string; status: string; file_name: string; processing_time_ms: number | null }> = [];
  const pageSize = 25;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.from("awb_documents").select("id,status,file_name,processing_time_ms").order("updated_at", { ascending: false }).range(from, from + pageSize - 1);
    assert.ifError(error);
    documents.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }
  const { count, error: countError } = await client.from("awb_documents").select("id", { count: "exact", head: true });
  assert.ifError(countError);
  assert.equal(documents.length, count);

  const allFields: Array<{ document_id: string; status: string; value: string | null; original_value: string | null; confidence: number | string | null; needs_review: boolean }> = [];
  for (let index = 0; index < documents.length; index += 100) {
    const ids = documents.slice(index, index + 100).map((document) => document.id);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from("awb_fields").select("id,document_id,status,value,original_value,confidence,needs_review").in("document_id", ids).order("id", { ascending: true }).range(from, from + 999);
      assert.ifError(error);
      allFields.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  const { count: fieldCount, error: fieldCountError } = await client.from("awb_fields").select("document_id", { count: "exact", head: true });
  assert.ifError(fieldCountError);
  assert.equal(allFields.length, fieldCount);

  const statusCounts = new Map<string, number>();
  for (const document of documents) statusCounts.set(document.status, (statusCounts.get(document.status) ?? 0) + 1);
  assert.equal([...statusCounts.values()].reduce((sum, value) => sum + value, 0), documents.length);

  const fieldsByDocument = new Map<string, typeof allFields>();
  for (const field of allFields) {
    const group = fieldsByDocument.get(field.document_id) ?? [];
    group.push(field);
    fieldsByDocument.set(field.document_id, group);
  }
  let traversedFields = 0;
  let traversedEditedFields = 0;
  for (const document of documents) {
    const fields = fieldsByDocument.get(document.id) ?? [];
    traversedFields += fields.length;
    traversedEditedFields += fields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value)).length;
    assert.equal(fields.filter((field) => ["valid", "warning", "review", "missing"].includes(field.status)).length, fields.length);
    assert.ok(validConfidencePercentages(fields.map((field) => field.confidence)).every((value) => value >= 0 && value <= 100));
    assert.ok(validProcessingTimes([document.processing_time_ms]).every((value) => value >= 0));
  }
  assert.equal(traversedFields, allFields.length);
  assert.equal(traversedEditedFields, allFields.filter((field) => isFieldDifferentFromAiOutput(field.value, field.original_value)).length);

  const sampleAwb = await client.from("awb_fields").select("document_id,value").eq("key", "awb_number").not("value", "is", null).limit(1).single();
  assert.ifError(sampleAwb.error);
  const awbSearch = await client.from("awb_fields").select("document_id").eq("key", "awb_number").ilike("value", `%${sampleAwb.data.value}%`);
  assert.ifError(awbSearch.error);
  assert.ok(awbSearch.data.some((row) => row.document_id === sampleAwb.data.document_id));

  const sampleFile = documents.find((document) => document.file_name)?.file_name;
  assert.ok(sampleFile);
  const fileSearch = await client.from("awb_documents").select("id").ilike("file_name", `%${sampleFile!.toUpperCase()}%`);
  assert.ifError(fileSearch.error);
  assert.ok(fileSearch.data.length >= 1);
  const noResultSearch = await client.from("awb_documents").select("id").ilike("file_name", "%__semlox_no_such_document__%");
  assert.ifError(noResultSearch.error);
  assert.equal(noResultSearch.data.length, 0);

  for (const status of ["draft", "failed", "issued", "review_required"]) {
    const { count: filteredCount, error } = await client.from("awb_documents").select("id", { count: "exact", head: true }).eq("status", status);
    assert.ifError(error);
    assert.equal(filteredCount, statusCounts.get(status));
  }

  const failed = documents.find((document) => document.status === "failed");
  assert.ok(failed);
  assert.ok(Array.isArray(fieldsByDocument.get(failed!.id) ?? []));
});
