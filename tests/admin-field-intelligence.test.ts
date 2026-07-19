import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { aggregateFieldGroup, aggregateFieldIntelligence, normalizeFieldKey } from "../lib/admin/field-intelligence.ts";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { parseAdminFieldIntelligenceQuery, validateAdminFieldKey } from "../lib/admin/server/validation.ts";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { CURRENT_AWB_FIELD_KEYS } from "../lib/awb/fieldRegistry.ts";

const row = (overrides: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), document_id: crypto.randomUUID(), key: "awb_number", label: "AWB Number", value: "123", original_value: "123", confidence: 0.9, needs_review: false, status: "valid", created_at: null, updated_at: null, ...overrides });

test("field keys normalize casing, whitespace and blanks safely", () => {
  assert.equal(normalizeFieldKey(" AWB_Number "), "awb_number");
  assert.equal(normalizeFieldKey(""), "unknown_field");
  assert.equal(normalizeFieldKey(null), "unknown_field");
});

test("same normalized key groups together while different keys remain separate", () => {
  const result = aggregateFieldIntelligence([row({ key: " AWB_NUMBER " }), row({ key: "awb_number" }), row({ key: "pieces" })], { search: null, status: null, sortBy: "fieldLabel", sortOrder: "asc" });
  assert.equal(result.items.length, 2);
  assert.equal(result.items.find((item) => item.fieldKey === "awb_number")?.occurrenceCount, 2);
});

test("most frequent non-empty label wins deterministically", () => {
  const metric = aggregateFieldGroup("awb_number", [row({ label: "Alias" }), row({ label: "AWB Number" }), row({ label: "AWB Number" }), row({ label: "" })]);
  assert.equal(metric.fieldLabel, "AWB Number");
});

test("status, review overlap, confidence and edited metrics are transparent", () => {
  const metric = aggregateFieldGroup("awb_number", [
    row({ status: "valid", confidence: 1 }),
    row({ status: "warning", confidence: "0.5", needs_review: true }),
    row({ status: "review", confidence: null, needs_review: true, value: "changed" }),
    row({ status: "missing", confidence: "bad" }),
  ]);
  assert.deepEqual([metric.validCount, metric.warningCount, metric.reviewCount, metric.missingCount], [1, 1, 1, 1]);
  assert.equal(metric.needsReviewCount, 2);
  assert.equal(metric.editedFieldCount, 1);
  assert.equal(metric.averageConfidence, 75);
  assert.equal(metric.coverageRate, 75);
  for (const rate of [metric.coverageRate, metric.validRate, metric.reviewStatusRate, metric.missingRate, metric.needsReviewRate, metric.editedFieldRate]) assert.ok(rate >= 0 && rate <= 100);
});

test("global confidence is weighted by raw valid samples", () => {
  const result = aggregateFieldIntelligence([row({ key: "rare", confidence: 0 }), row({ key: "common", confidence: 1 }), row({ key: "common", confidence: 1 }), row({ key: "common", confidence: 1 })], { search: null, status: null, sortBy: "editedFieldRate", sortOrder: "desc" });
  assert.equal(result.summary.averageConfidence, 75);
});

test("field with no valid confidence returns null", () => {
  assert.equal(aggregateFieldGroup("unknown", [row({ confidence: null }), row({ confidence: "bad" }), row({ confidence: -1 }), row({ confidence: 2 })]).averageConfidence, null);
});

test("accepted difference utility treats whitespace and case changes as current differences", () => {
  const metric = aggregateFieldGroup("value", [row({ value: null, original_value: null }), row({ value: "ABC", original_value: "abc" }), row({ value: "value ", original_value: "value" })]);
  assert.equal(metric.editedFieldCount, 2);
});

test("field filters and query validation are allowlisted", () => {
  assert.equal(parseAdminFieldIntelligenceQuery(new URLSearchParams()).ok, true);
  for (const query of ["status=unknown", "sortBy=value", "sortOrder=sideways", `search=${"x".repeat(101)}`]) assert.equal(parseAdminFieldIntelligenceQuery(new URLSearchParams(query)).ok, false);
  assert.equal(validateAdminFieldKey("awb_number").ok, true);
  assert.equal(validateAdminFieldKey("../secret").ok, false);
});

test("empty field dataset returns safe empty analytics", () => {
  const result = aggregateFieldIntelligence([], { search: null, status: null, sortBy: "editedFieldRate", sortOrder: "desc" });
  assert.equal(result.items.length, 0);
  assert.equal(result.summary.totalFieldRows, 0);
  assert.equal(result.summary.averageConfidence, null);
});

test("current AWB registry excludes historical field types without changing raw totals", () => {
  const result = aggregateFieldIntelligence(
    [row({ key: "awb_number" }), row({ key: "flight_date", label: "Flight Date" })],
    { search: null, status: null, sortBy: "fieldLabel", sortOrder: "asc" },
    CURRENT_AWB_FIELD_KEYS
  );
  assert.deepEqual(result.items.map((item) => item.fieldKey), ["awb_number"]);
  assert.equal(result.summary.totalFieldRows, 2);
  assert.equal(result.summary.distinctFieldCount, 1);
});
