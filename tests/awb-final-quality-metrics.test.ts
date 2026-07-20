import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { calculateFinalQualityMetrics, calculateIssuedFinalQualityMetrics, normalizeAwbComparisonValue } from "../lib/awb/finalQualityMetrics.ts";

const field = (
  originalValue: unknown,
  finalValue: unknown,
  confidence: unknown = 0.8
) => ({ originalValue, finalValue, confidence, status: "valid" });

test("normalizes surrounding and repeated whitespace", () => {
  assert.equal(normalizeAwbComparisonValue("  FRA   Airport "), "FRA Airport");
});

test("classifies unchanged, changed, added, cleared, and empty fields", () => {
  const result = calculateFinalQualityMetrics([
    field("FRA", "FRA"),
    field("FRA", "IAH"),
    field("", "FRA"),
    field("FRA", ""),
    field("", ""),
  ]);
  assert.equal(result.totalFieldsCount, 5);
  assert.equal(result.evaluatedFieldsCount, 4);
  assert.equal(result.unchangedFieldsCount, 1);
  assert.equal(result.correctedFieldsCount, 3);
  assert.equal(result.finalFieldAccuracyPercent, 25);
  assert.equal(result.correctionRatePercent, 75);
});

test("treats whitespace-only changes as unchanged", () => {
  const result = calculateFinalQualityMetrics([field(" FRA ", "FRA")]);
  assert.equal(result.unchangedFieldsCount, 1);
  assert.equal(result.correctedFieldsCount, 0);
});

test("uses only the final value after repeated edits", () => {
  const result = calculateFinalQualityMetrics([field("FRA", "DXB")]);
  assert.equal(result.correctedFieldsCount, 1);
});

test("returns null percentages when no fields are evaluated", () => {
  const result = calculateFinalQualityMetrics([field("", "")]);
  assert.equal(result.finalFieldAccuracyPercent, null);
  assert.equal(result.correctionRatePercent, null);
});

test("accuracy and correction are complementary", () => {
  const result = calculateFinalQualityMetrics([
    ...Array.from({ length: 14 }, () => field("FRA", "FRA")),
    ...Array.from({ length: 3 }, () => field("FRA", "IAH")),
  ]);
  assert.ok(result.finalFieldAccuracyPercent !== null);
  assert.ok(result.correctionRatePercent !== null);
  assert.equal(
    result.finalFieldAccuracyPercent + result.correctionRatePercent,
    100
  );
  assert.equal(result.finalFieldAccuracyPercent, (14 / 17) * 100);
});

test("AI confidence remains based on original populated fields", () => {
  const unchanged = calculateFinalQualityMetrics([
    field("FRA", "FRA", 0),
    field("IAH", "IAH", 1),
    field("", "DXB", 0.9),
  ]);
  const corrected = calculateFinalQualityMetrics([
    field("FRA", "LHR", 0),
    field("IAH", "", 1),
    field("", "DXB", 0.9),
  ]);
  assert.equal(unchanged.averageAiConfidencePercent, 50);
  assert.equal(corrected.averageAiConfidencePercent, 50);
  assert.equal(unchanged.confidenceSampleCount, 2);
});

test("finalized aggregates exclude draft documents", () => {
  const result = calculateIssuedFinalQualityMetrics(
    [
      { id: "issued", status: "issued" },
      { id: "draft", status: "draft" },
    ],
    [
      { documentId: "issued", ...field("FRA", "FRA") },
      { documentId: "draft", ...field("FRA", "IAH") },
    ]
  );
  assert.equal(result.evaluatedFieldsCount, 1);
  assert.equal(result.unchangedFieldsCount, 1);
  assert.equal(result.correctedFieldsCount, 0);
  assert.equal(result.finalFieldAccuracyPercent, 100);
});
