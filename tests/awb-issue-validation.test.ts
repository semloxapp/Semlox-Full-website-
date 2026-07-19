import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { CURRENT_AWB_FIELD_DEFINITIONS, CURRENT_AWB_FIELD_KEYS, REQUIRED_AWB_FIELD_KEYS } from "../lib/awb/fieldRegistry.ts";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { validateAwbForIssue } from "../lib/awb/issueValidation.ts";

const field = (key: string, value = "value") => ({
  key,
  label: key.replace(/_/g, " "),
  value,
  confidence: 1,
  confidencePercent: 100,
  needsReview: false,
  status: value ? "valid" as const : "missing" as const,
  color: value ? "green" as const : "red" as const,
});

test("every issue-required key belongs to the current authoritative registry", () => {
  assert.equal(CURRENT_AWB_FIELD_DEFINITIONS.length, 17);
  assert.ok(REQUIRED_AWB_FIELD_KEYS.every((key) => CURRENT_AWB_FIELD_KEYS.has(key)));
  assert.equal(REQUIRED_AWB_FIELD_KEYS.includes("flight_date" as never), false);
});

test("a current 17-field document is not rejected because flight_date is absent", () => {
  const result = validateAwbForIssue(CURRENT_AWB_FIELD_DEFINITIONS.map(({ key }) => field(key)));
  assert.deepEqual(result.invalidFields, []);
});

test("a historical flight_date row is compatibility data, not an issue requirement", () => {
  const fields = [
    ...REQUIRED_AWB_FIELD_KEYS.map((key) => field(key)),
    field("flight_date", ""),
  ];
  assert.deepEqual(validateAwbForIssue(fields).invalidFields, []);
});

test("an empty current required field is rejected", () => {
  const fields = REQUIRED_AWB_FIELD_KEYS.map((key) => field(key, key === "awb_number" ? "" : "value"));
  assert.deepEqual(validateAwbForIssue(fields).invalidFields.map(({ key }) => key), ["awb_number"]);
});
