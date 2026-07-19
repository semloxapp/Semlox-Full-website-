import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { parseAdminDocumentQuery, validateAdminDocumentId } from "../lib/admin/server/validation.ts";

const parse = (query: string) => parseAdminDocumentQuery(new URLSearchParams(query));

test("document query uses safe defaults", () => {
  assert.deepEqual(parse(""), { ok: true, value: { page: 1, pageSize: 25, search: null, status: null, sortBy: "updatedAt", sortOrder: "desc" } });
});

test("document query rejects invalid pagination", () => {
  for (const query of ["page=0", "page=-1", "page=x", "pageSize=0", "pageSize=101", "pageSize=x"]) assert.equal(parse(query).ok, false);
});

test("document query rejects unsupported filters and sorting", () => {
  for (const query of ["status=completed", "sortBy=raw_response", "sortOrder=random", `search=${"x".repeat(101)}`]) assert.equal(parse(query).ok, false);
});

test("document query accepts every live status and safe sort", () => {
  for (const status of ["draft", "failed", "issued", "review_required"]) assert.equal(parse(`status=${status}`).ok, true);
  for (const sortBy of ["createdAt", "updatedAt", "status", "processingTime", "fileName"]) assert.equal(parse(`sortBy=${sortBy}`).ok, true);
});

test("document id must be a UUID", () => {
  assert.equal(validateAdminDocumentId("not-an-id").ok, false);
  assert.equal(validateAdminDocumentId("123e4567-e89b-42d3-a456-426614174000").ok, true);
});
