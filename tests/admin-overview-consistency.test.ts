import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { resolvePlatformAdminGuard } from "../lib/admin/authorization.ts";
import {
  average,
  boundedPercent,
  countByStatus,
  EDITED_FIELDS_LABEL,
  EDITED_FIELDS_TOOLTIP,
  validConfidencePercentages,
  validProcessingTimes,
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
} from "../lib/admin/metrics.ts";

test("document status buckets remain mutually exclusive", () => {
  const documents = [{ status: "issued" }, { status: "review_required" }, { status: "failed" }, { status: "draft" }];
  const counts = countByStatus(documents);
  assert.equal([...counts.values()].reduce((sum, value) => sum + value, 0), documents.length);
});

test("confidence ignores null, malformed and out-of-range values", () => {
  const values = validConfidencePercentages([0.9, "0.7", null, "bad", -0.1, 1.1]);
  assert.deepEqual(values, [90, 70]);
  assert.equal(average(values), 80);
});

test("rates are bounded and empty datasets return zero", () => {
  assert.equal(boundedPercent(3, 4), 75);
  assert.equal(boundedPercent(8, 4), 100);
  assert.equal(boundedPercent(0, 0), 0);
  assert.equal(average([]), 0);
  assert.equal(countByStatus([]).size, 0);
});

test("processing time rejects negative and malformed values", () => {
  assert.deepEqual(validProcessingTimes([1000, 0, null, -1, Number.NaN]), [1000, 0]);
});

test("authorization resolves logged-out, non-admin and platform-admin states", () => {
  assert.deepEqual(resolvePlatformAdminGuard({ authenticated: false, authorized: false, admin: null }), { ok: false, status: 401, code: "UNAUTHENTICATED" });
  assert.deepEqual(resolvePlatformAdminGuard({ authenticated: true, authorized: false, admin: null }), { ok: false, status: 403, code: "FORBIDDEN" });
  assert.equal(resolvePlatformAdminGuard({ authenticated: true, authorized: true, admin: { email: "admin@example.test", name: "Admin" } }).ok, true);
});

test("edited-field metric is explicitly not historical correction history", () => {
  assert.equal(EDITED_FIELDS_LABEL, "Fields Different from AI Output");
  assert.match(EDITED_FIELDS_TOOLTIP, /not a historical correction-event count/i);
});
