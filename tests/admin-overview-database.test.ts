import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("live Overview source rows reconcile with exact database counts", { skip: !url || !serviceKey }, async () => {
  const client = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

  async function readAll(table: "awb_documents" | "awb_fields", columns: string) {
    const rows: Array<Record<string, unknown>> = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from(table).select(columns).range(from, from + 999);
      assert.ifError(error);
      rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>));
      if ((data?.length ?? 0) < 1000) return rows;
    }
  }

  const [{ count: documentCount, error: documentCountError }, { count: fieldCount, error: fieldCountError }, documents, fields] = await Promise.all([
    client.from("awb_documents").select("id", { count: "exact", head: true }),
    client.from("awb_fields").select("document_id", { count: "exact", head: true }),
    readAll("awb_documents", "id,status,processing_time_ms"),
    readAll("awb_fields", "document_id,status,confidence,needs_review,value,original_value"),
  ]);

  assert.ifError(documentCountError);
  assert.ifError(fieldCountError);
  assert.equal(documents.length, documentCount);
  assert.equal(fields.length, fieldCount);

  const statusTotal = new Map<string, number>();
  for (const row of documents) {
    const status = String(row.status);
    statusTotal.set(status, (statusTotal.get(status) ?? 0) + 1);
  }
  assert.equal([...statusTotal.values()].reduce((sum, value) => sum + value, 0), documents.length);

  const confidenceValues = fields
    .map((row) => row.confidence === null ? Number.NaN : Number(row.confidence))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1);
  assert.ok(confidenceValues.every((value) => value >= 0 && value <= 1));

  const processingTimes = documents
    .map((row) => row.processing_time_ms)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  assert.ok(processingTimes.every((value) => value >= 0));
});
