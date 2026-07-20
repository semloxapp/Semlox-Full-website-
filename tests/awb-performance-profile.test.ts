import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node strip-types resolves this TypeScript module at runtime.
import { createAwbPerformanceProfiler } from "../lib/awb/performanceProfile.ts";

test("records mutually exclusive stages and remaining unaccounted time", async () => {
  let now = 0;
  const profile = createAwbPerformanceProfiler("profile-1", () => now);

  await profile.measure("authentication", async () => {
    now += 12.345;
  });
  profile.measureSync("normalization", () => {
    now += 7.655;
  });
  now += 5;

  assert.deepEqual(profile.finish(), {
    profileId: "profile-1",
    totalMeasuredMs: 25,
    accountedStageMs: 20,
    unaccountedMs: 5,
    stagesMs: {
      authentication: 12.35,
      normalization: 7.65,
    },
  });
});

test("accumulates repeated measurements for the same stage", async () => {
  let now = 0;
  const profile = createAwbPerformanceProfiler("profile-2", () => now);
  await profile.measure("database", async () => {
    now += 3;
  });
  await profile.measure("database", async () => {
    now += 4;
  });

  assert.equal(profile.finish().stagesMs.database, 7);
});
