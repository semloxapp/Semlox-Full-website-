import test from "node:test";
import assert from "node:assert/strict";
import { isFeatureFlagEnabled } from "../lib/features/featureFlag.ts";
import { formatDuration } from "../lib/formatDuration.ts";
import { timingCompletenessFromSummary } from "../lib/awb/timingMetrics.ts";

test("feature flags enable only for the exact true value", () => {
  assert.equal(isFeatureFlagEnabled("true"), true);
  assert.equal(isFeatureFlagEnabled("false"), false);
  assert.equal(isFeatureFlagEnabled("TRUE"), false);
  assert.equal(isFeatureFlagEnabled("1"), false);
  assert.equal(isFeatureFlagEnabled(undefined), false);
});

test("shared duration formatter handles compact values and unavailable data", () => {
  assert.equal(formatDuration(812), "812ms");
  assert.equal(formatDuration(3420), "3.42s");
  assert.equal(formatDuration(68_000), "1m 08s");
  assert.equal(formatDuration(8_040_000), "2h 14m");
  assert.equal(formatDuration(null), "N/A");
});

test("timing completeness distinguishes complete, partial, legacy and unavailable", () => {
  const complete = {
    timing_metrics: {
      processing: {
        extractor_ms: 1,
        llm_ms: 2,
        business_logic_ms: 3,
        total_ms: 6,
      },
      review: { active_ms: 10 },
      lifecycle: { upload_to_issue_ms: 20 },
    },
  };
  assert.equal(timingCompletenessFromSummary(complete, null), "complete");
  assert.equal(
    timingCompletenessFromSummary(
      { timing_metrics: { processing: { total_ms: 6 } } },
      null
    ),
    "partial"
  );
  assert.equal(timingCompletenessFromSummary(null, 1000), "legacy");
  assert.equal(timingCompletenessFromSummary(null, null), "unavailable");
});
