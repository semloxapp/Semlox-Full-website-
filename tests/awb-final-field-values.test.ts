import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { countCorrectedAwbFieldValues, displayAwbFieldValue, replaceSubmittedAwbFieldValue, verifySubmittedAwbFieldValues } from "../lib/awb/finalFieldValues.ts";

test("successive form edits merge into the latest issue snapshot", () => {
  const initial = [
    { key: "awb_number", value: "ABC" },
    { key: "pieces", value: "1" },
  ];
  const afterFirstEdit = replaceSubmittedAwbFieldValue(initial, "awb_number", "XYZ");
  const issueSnapshot = replaceSubmittedAwbFieldValue(afterFirstEdit, "pieces", "2");
  assert.deepEqual(issueSnapshot, [
    { key: "awb_number", value: "XYZ" },
    { key: "pieces", value: "2" },
  ]);
});

test("issue verification accepts corrected final values and preserves originals", () => {
  const persisted = [
    { key: "awb_number", original_value: "ABC", value: "XYZ" },
  ];
  assert.equal(
    verifySubmittedAwbFieldValues([{ key: "awb_number", value: "XYZ" }], persisted),
    true
  );
  assert.equal(persisted[0].original_value, "ABC");
  assert.equal(countCorrectedAwbFieldValues(persisted), 1);
});

test("issue verification rejects stale or missing persisted values", () => {
  const persisted = [
    { key: "awb_number", original_value: "ABC", value: "ABC" },
  ];
  assert.equal(
    verifySubmittedAwbFieldValues([{ key: "awb_number", value: "XYZ" }], persisted),
    false
  );
  assert.equal(
    verifySubmittedAwbFieldValues([{ key: "awb_number", value: "ABC" }, { key: "pieces", value: "2" }], persisted),
    false
  );
});

test("multiple corrected values are counted and unchanged values are not", () => {
  const fields = [
    { key: "one", original_value: "ABC", value: "XYZ" },
    { key: "two", original_value: "1", value: "2" },
    { key: "three", original_value: "same", value: "same" },
  ];
  assert.equal(countCorrectedAwbFieldValues(fields), 2);
});

test("intentional empty final value is not replaced by the original", () => {
  assert.equal(
    displayAwbFieldValue({ key: "awb_number", original_value: "ABC", value: "" }),
    ""
  );
});

test("legacy null final value falls back to the original for display only", () => {
  assert.equal(
    displayAwbFieldValue({ key: "awb_number", original_value: "ABC", value: null }),
    "ABC"
  );
});
