import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { aggregateFieldIntelligence } from "../lib/admin/field-intelligence.ts";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { CURRENT_AWB_FIELD_KEYS } from "../lib/awb/fieldRegistry.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("live Field Intelligence reconciles with Overview and Document Audit", { skip: !url || !serviceKey }, async () => {
  const client = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });
  const rows: Array<{ id: string; document_id: string; key: string | null; label: string | null; value: string | null; original_value: string | null; confidence: number | string | null; needs_review: boolean; status: string; created_at: string | null; updated_at: string | null }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("awb_fields").select("id,document_id,key,label,value,original_value,confidence,needs_review,status,created_at,updated_at").order("id", { ascending: true }).range(from, from + 999);
    assert.ifError(error);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  const analytics = aggregateFieldIntelligence(rows, { search: null, status: null, sortBy: "editedFieldRate", sortOrder: "desc" }, CURRENT_AWB_FIELD_KEYS);
  const currentRows = rows.filter((row) => CURRENT_AWB_FIELD_KEYS.has(row.key?.trim().toLowerCase() || "unknown_field"));
  assert.equal(analytics.items.reduce((sum, item) => sum + item.occurrenceCount, 0), currentRows.length);
  assert.equal(analytics.summary.totalFieldRows, rows.length);
  assert.equal(analytics.summary.validFieldCount + analytics.summary.warningFieldCount + analytics.summary.reviewFieldCount + analytics.summary.missingFieldCount, rows.length);
  assert.equal(analytics.items.length, new Set(currentRows.map((row) => row.key?.trim().toLowerCase())).size);
  assert.ok(analytics.items.every((item) => CURRENT_AWB_FIELD_KEYS.has(item.fieldKey)));
  for (const item of analytics.items) {
    assert.equal(item.validCount + item.warningCount + item.reviewCount + item.missingCount, item.occurrenceCount);
    assert.ok(item.documentCount <= item.occurrenceCount);
    assert.ok(item.averageConfidence === null || item.averageConfidence >= 0 && item.averageConfidence <= 100);
  }
});
