import test from "node:test";
import assert from "node:assert/strict";
import { parseAdminAnalyticsScope } from "../lib/admin/server/validation.ts";

test("analytics scope accepts bounded ISO timestamps and UUID ownership filters", () => {
  const params = new URLSearchParams({
    dateFrom: "2026-07-01T00:00:00.000Z",
    dateTo: "2026-07-17T23:59:59.000Z",
    companyId: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
  });
  const result = parseAdminAnalyticsScope(params);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, Object.fromEntries(params));
});

test("analytics scope rejects reversed dates and malformed IDs", () => {
  assert.equal(parseAdminAnalyticsScope(new URLSearchParams({ dateFrom: "2026-07-18", dateTo: "2026-07-17" })).ok, false);
  assert.equal(parseAdminAnalyticsScope(new URLSearchParams({ companyId: "not-a-company-id" })).ok, false);
  assert.equal(parseAdminAnalyticsScope(new URLSearchParams({ userId: "not-a-user-id" })).ok, false);
});
