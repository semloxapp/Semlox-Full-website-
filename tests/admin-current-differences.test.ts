import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { buildAdminCurrentDifferenceDetail, buildAdminCurrentDifferences } from "../lib/admin/current-differences.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { parseAdminCurrentDifferencesQuery, validateAdminFieldId } from "../lib/admin/server/validation.ts";

const document = (id: string, status = "issued") => ({ id, file_name: `${id}.pdf`, status, run_id: null, processing_time_ms: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" });
const field = (overrides: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), document_id: "11111111-1111-4111-8111-111111111111", key: "awb_number", label: "AWB Number", value: "current", original_value: "original", confidence: 0.8, needs_review: false, status: "valid", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", ...overrides });
const query = (overrides: Record<string, unknown> = {}) => ({ page: 1, pageSize: 25, search: null, fieldKey: null, fieldStatus: null, documentStatus: null, needsReview: null, includeLegacy: false, sortBy: "fieldUpdatedAt" as const, sortOrder: "desc" as const, ...overrides });

test("canonical differences are default while legacy totals remain reconciled", () => {
  const documents = [document("11111111-1111-4111-8111-111111111111")];
  const result = buildAdminCurrentDifferences([field(), field({ key: "flight_date", label: "Flight Date" }), field({ key: "pieces", value: "same", original_value: "same" })], documents, query());
  assert.deepEqual([result.summary.rawDifferenceCount, result.summary.canonicalDifferenceCount, result.summary.legacyDifferenceCount], [2, 1, 1]);
  assert.equal(result.items.length, 1); assert.equal(result.items[0].fieldKey, "awb_number");
  const withLegacy = buildAdminCurrentDifferences([field(), field({ key: "flight_date", label: "Flight Date" })], documents, query({ includeLegacy: true }));
  assert.equal(withLegacy.items.length, 2);
});

test("filters, search, sorting and pagination operate on safe DTO fields", () => {
  const documents = [document("11111111-1111-4111-8111-111111111111", "draft"), document("22222222-2222-4222-8222-222222222222")];
  const fields = [field({ label: "AWB Number", needs_review: true }), field({ document_id: documents[1].id, key: "gross_weight", label: "Gross Weight", confidence: 0.4 })];
  assert.equal(buildAdminCurrentDifferences(fields, documents, query({ fieldKey: "gross_weight" })).items.length, 1);
  assert.equal(buildAdminCurrentDifferences(fields, documents, query({ fieldStatus: "valid", documentStatus: "draft", needsReview: true })).items.length, 1);
  assert.equal(buildAdminCurrentDifferences(fields, documents, query({ search: "Gross" })).items[0].fieldKey, "gross_weight");
  const paged = buildAdminCurrentDifferences(fields, documents, query({ page: 2, pageSize: 1 })); assert.equal(paged.items.length, 1); assert.equal(paged.pagination.totalItems, 2);
  assert.equal(buildAdminCurrentDifferences(fields, documents, query({ search: "no-result" })).items.length, 0);
});

test("detail reports real current values and document context without event claims", () => {
  const doc = document("11111111-1111-4111-8111-111111111111", "failed"); const changed = field({ confidence: null, value: "x" }); const long = "x".repeat(600);
  const detail = buildAdminCurrentDifferenceDetail({ ...changed, value: long }, doc, [{ ...changed, value: long }, field({ key: "pieces", value: "same", original_value: "same" })]);
  assert.equal(detail.field.currentValue, long); assert.equal(detail.field.confidence, null); assert.equal(detail.document.status, "failed"); assert.equal(detail.context.documentDifferenceCount, 1); assert.equal(detail.capabilities.hasHistoricalCorrectionEvents, false);
});

test("query validation allowlists filters and bounds", () => {
  assert.equal(parseAdminCurrentDifferencesQuery(new URLSearchParams()).ok, true);
  for (const value of ["page=0", "pageSize=101", "fieldKey=flight_date", "fieldStatus=edited", "documentStatus=unknown", "needsReview=yes", "includeLegacy=yes", "sortBy=value", `search=${"x".repeat(101)}`]) assert.equal(parseAdminCurrentDifferencesQuery(new URLSearchParams(value)).ok, false);
  assert.equal(parseAdminCurrentDifferencesQuery(new URLSearchParams("includeLegacy=true&fieldKey=flight_date")).ok, true);
  assert.equal(validateAdminFieldId(crypto.randomUUID()).ok, true); assert.equal(validateAdminFieldId("missing").ok, false);
});
