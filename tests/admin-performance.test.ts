import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { buildAdminPerformance, buildAdminPerformanceDocumentList, buildProcessingDistribution, median, nearestRankPercentile, processingSeconds } from "../lib/admin/performance.ts";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { parseAdminPerformanceDocumentQuery } from "../lib/admin/server/validation.ts";

const document = (overrides: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), file_name: "sample.pdf", status: "issued", run_id: null, processing_time_ms: 1000, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", ...overrides });
const field = (documentId: string, overrides: Record<string, unknown> = {}) => ({ id: crypto.randomUUID(), document_id: documentId, key: "awb_number", label: "AWB Number", value: "123", original_value: "123", confidence: 0.8, needs_review: false, status: "valid", created_at: null, updated_at: null, ...overrides });

test("processing-time validation preserves zero and rejects invalid values", () => {
  assert.equal(processingSeconds(0), 0);
  assert.equal(processingSeconds(1500), 1.5);
  assert.equal(processingSeconds(null), null);
  assert.equal(processingSeconds(-1), null);
  assert.equal(processingSeconds(Number.NaN), null);
  assert.equal(processingSeconds(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER / 1000);
});

test("statistics use deterministic median and nearest-rank percentiles", () => {
  assert.equal(median([]), null); assert.equal(median([4]), 4); assert.equal(median([3, 1, 2]), 2); assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(nearestRankPercentile([], .9), null); assert.equal(nearestRankPercentile([1], .95), 1); assert.equal(nearestRankPercentile([1, 2, 3, 4, 5], .9), 5);
});

test("distribution boundaries are exclusive and cover every sample", () => {
  const values = [0, 9.999, 10, 19.999, 20, 29.999, 30, 44.999, 45, 59.999, 60, 100];
  const distribution = buildProcessingDistribution(values);
  assert.deepEqual(distribution.map((bucket) => bucket.count), [2, 2, 2, 2, 2, 2]);
  assert.equal(distribution.reduce((sum, bucket) => sum + bucket.count, 0), values.length);
  assert.equal(buildProcessingDistribution([]).reduce((sum, bucket) => sum + bucket.count, 0), 0);
});

test("summary accounts for failures, missing times and percentile ordering", () => {
  const documents = [document({ processing_time_ms: 0 }), document({ processing_time_ms: 2000 }), document({ processing_time_ms: 4000 }), document({ status: "failed", processing_time_ms: null })];
  const result = buildAdminPerformance(documents, []);
  assert.deepEqual([result.summary.totalDocuments, result.summary.validProcessingSampleCount, result.summary.missingOrInvalidProcessingTimeCount], [4, 3, 1]);
  assert.equal(result.summary.failedDocumentCount, 1); assert.equal(result.summary.failureRate, 25); assert.equal(result.summary.failedDocumentProcessingSampleCount, 0);
  assert.ok(result.summary.fastestProcessingTimeSeconds! <= result.summary.medianProcessingTimeSeconds!);
  assert.ok(result.summary.medianProcessingTimeSeconds! <= result.summary.p90ProcessingTimeSeconds!);
  assert.ok(result.summary.p90ProcessingTimeSeconds! <= result.summary.p95ProcessingTimeSeconds!);
  assert.ok(result.summary.p95ProcessingTimeSeconds! <= result.summary.slowestProcessingTimeSeconds!);
});

test("no samples and all-failed datasets return truthful null metrics", () => {
  const result = buildAdminPerformance([document({ status: "failed", processing_time_ms: null })], []);
  assert.equal(result.summary.averageProcessingTimeSeconds, null); assert.equal(result.summary.medianProcessingTimeSeconds, null); assert.equal(result.summary.failedDocumentCount, 1); assert.equal(result.summary.failedDocumentMissingTimeCount, 1);
  assert.equal(result.processingTrend[0].averageProcessingTimeSeconds, null);
  assert.equal(result.failedDocumentsPreview[0].failureCategory, null); assert.match(result.failedDocumentsPreview[0].safeFailureMessage!, /unavailable/i);
});

test("document DTOs do not expose raw errors and lists preserve pagination", () => {
  const doc = document({ status: "failed", processing_time_ms: null }); const fields = [field(doc.id)];
  const query = { type: "failed" as const, page: 2, pageSize: 1, search: null, sortBy: "updatedAt" as const, sortOrder: "desc" as const };
  const result = buildAdminPerformanceDocumentList([doc], fields, 3, query);
  assert.equal(result.pagination.totalPages, 3); assert.equal(result.items[0].awbNumber, "123"); assert.equal(result.items[0].failureCategory, null); assert.equal(result.items[0].processingTimeSeconds, null);
});

test("performance list query validation is strictly allowlisted", () => {
  assert.equal(parseAdminPerformanceDocumentQuery(new URLSearchParams()).ok, true);
  assert.equal(parseAdminPerformanceDocumentQuery(new URLSearchParams("type=failed")).ok, true);
  for (const value of ["type=all", "page=0", "pageSize=101", "sortBy=retry", "sortOrder=random", `search=${"x".repeat(101)}`]) assert.equal(parseAdminPerformanceDocumentQuery(new URLSearchParams(value)).ok, false);
});
