import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAdminStatusLabel,
  getAdminConfidenceTone,
  getAdminCorrectionRateTone,
  getAdminStatusTone,
  normalizeAdminStatus,
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
} from "../lib/admin/status.ts";

test("normalizes status labels before semantic classification", () => {
  assert.equal(normalizeAdminStatus("  Review   Required "), "review required");
  assert.equal(getAdminStatusTone("issued"), "success");
  assert.equal(getAdminStatusTone("review_required"), "warning");
  assert.equal(getAdminStatusTone("draft"), "partial");
  assert.equal(getAdminStatusTone("failed"), "danger");
  assert.equal(getAdminStatusTone("processing"), "info");
  assert.equal(getAdminStatusTone("unmapped status"), "neutral");
});

test("formats raw status values for human-readable UI labels", () => {
  assert.equal(formatAdminStatusLabel("review_required"), "Review Required");
  assert.equal(formatAdminStatusLabel("  ready_to_issue "), "Ready To Issue");
});

test("uses the documented confidence thresholds", () => {
  assert.deepEqual(
    [95, 80, 65, 45, 20].map(getAdminConfidenceTone),
    ["success", "info", "warning", "partial", "danger"],
  );
});

test("uses inverse correction-rate thresholds", () => {
  assert.deepEqual(
    [5, 10, 20, 30, 31].map(getAdminCorrectionRateTone),
    ["success", "info", "warning", "partial", "danger"],
  );
});
