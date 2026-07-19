import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types runner requires explicit TypeScript extensions.
import { applyReviewCheckpoint, closeActiveReviewInterval, countCorrectedFields, parseProviderTiming, parseReviewCheckpoint, timingMetricsFromSummary } from "../lib/awb/timingMetrics.ts";

test("parses provider timing seconds and prefers explicit milliseconds", () => {
  assert.deepEqual(
    parseProviderTiming({
      data: {
        meta: {
          timing: {
            extractor_seconds: 1.25,
            extractor_duration_ms: 900,
            llm_verify_seconds: 2.5,
            rules_seconds: 0.125,
            total_seconds: 4,
          },
        },
      },
    }),
    { extractor_ms: 900, llm_ms: 2500, business_logic_ms: 125, total_ms: 4000 }
  );
});

test("keeps missing, invalid, and legacy provider stage timings nullable", () => {
  assert.deepEqual(
    parseProviderTiming({ data: { meta: { timing: { total_seconds: 28.725 } } } }),
    { extractor_ms: null, llm_ms: null, business_logic_ms: null, total_ms: 28_725 }
  );
  assert.deepEqual(
    parseProviderTiming({
      data: {
        meta: {
          timing: {
            extractor_seconds: -1,
            llm_verify_seconds: Number.NaN,
            rules_seconds: Number.POSITIVE_INFINITY,
            total_seconds: "32.5",
          },
        },
      },
    }),
    { extractor_ms: null, llm_ms: null, business_logic_ms: null, total_ms: null }
  );
});

test("active review closes on hide, caps idle time, and resumes without overlap", () => {
  assert.equal(closeActiveReviewInterval(0, 1_000, 3_000, 5_000), 4_000);
  assert.equal(
    closeActiveReviewInterval(0, 1_000, 3_000, 1_000_000),
    182_000
  );
  const first = closeActiveReviewInterval(0, 1_000, 3_000, 5_000);
  assert.equal(closeActiveReviewInterval(first, 10_000, 10_000, 12_000), 6_000);
  assert.equal(closeActiveReviewInterval(first, null, 10_000, 12_000), first);
});

test("rejects invalid and mismatched review checkpoints", () => {
  assert.equal(parseReviewCheckpoint({}), null);
  assert.equal(
    parseReviewCheckpoint(
      { sessionId: "session_123", checkpointSequence: 1, activeMs: 50, reason: "issued" },
      "draft_saved"
    ),
    null
  );
  assert.equal(
    parseReviewCheckpoint({
      sessionId: "session_123",
      checkpointSequence: 2,
      activeMs: 180_000,
      reason: "inactive_timeout",
    })?.reason,
    "inactive_timeout"
  );
  assert.equal(
    parseReviewCheckpoint({
      sessionId: "session_123",
      checkpointSequence: 3,
      activeMs: 240_000,
      reason: "away_timeout",
    })?.reason,
    "away_timeout"
  );
});

test("review checkpoints are monotonic and idempotent per browser session", () => {
  const checkpoint = {
    sessionId: "session_123",
    checkpointSequence: 1,
    activeMs: 12_500,
    reason: "periodic" as const,
  };
  const first = applyReviewCheckpoint({}, checkpoint, "2026-07-19T00:00:00.000Z");
  assert.equal(first.accepted, true);
  assert.equal(timingMetricsFromSummary(first.summary).activeReviewMs, 12_500);
  const review = ((first.summary as Record<string, unknown>).timing_metrics as {
    review: Record<string, unknown>;
  }).review;
  assert.equal(review.method, "focus-visibility-activity-v2");
  assert.equal(review.away_grace_ms, 60_000);
  assert.equal(review.inactivity_grace_ms, 180_000);

  const duplicate = applyReviewCheckpoint(
    first.summary,
    checkpoint,
    "2026-07-19T00:01:00.000Z"
  );
  assert.equal(duplicate.accepted, false);
  assert.equal(timingMetricsFromSummary(duplicate.summary).activeReviewMs, 12_500);

  const secondSession = applyReviewCheckpoint(
    first.summary,
    {
      sessionId: "session_456",
      checkpointSequence: 1,
      activeMs: 2_500,
      reason: "draft_saved",
    },
    "2026-07-19T00:02:00.000Z"
  );
  assert.equal(timingMetricsFromSummary(secondSession.summary).activeReviewMs, 15_000);
  assert.equal(
    applyReviewCheckpoint(
      first.summary,
      { ...checkpoint, checkpointSequence: 2, activeMs: 10_000 },
      "2026-07-19T00:03:00.000Z"
    ).accepted,
    false
  );
});

test("counts only final values that differ from original extraction", () => {
  assert.equal(
    countCorrectedFields([
      { original_value: " 1250 KG ", value: "1250 KG" },
      { original_value: "LHE", value: "KHI" },
      { original_value: null, value: "" },
    ]),
    1
  );
  assert.equal(
    countCorrectedFields([
      { original_value: "A", value: "B" },
      { original_value: "C", value: "D" },
    ]),
    2
  );
});

test("timing summary remains backward compatible and preserves unrelated data", () => {
  const result = applyReviewCheckpoint(
    { validFields: 12, nested: { keep: true } },
    {
      sessionId: "session_789",
      checkpointSequence: 1,
      activeMs: 0,
      reason: "periodic",
    },
    "2026-07-19T00:00:00.000Z"
  );
  assert.deepEqual(
    { validFields: (result.summary as Record<string, unknown>).validFields,
      nested: (result.summary as Record<string, unknown>).nested },
    { validFields: 12, nested: { keep: true } }
  );
  assert.equal(timingMetricsFromSummary(null).correctedFieldsCount, null);
  assert.equal(
    timingMetricsFromSummary({
      timing_metrics: { quality: { corrected_fields_count: 0 } },
    }).correctedFieldsCount,
    0
  );
});
