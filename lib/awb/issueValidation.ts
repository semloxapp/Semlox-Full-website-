import type { AwbExtractedField } from "./types";
// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { REQUIRED_AWB_FIELD_KEYS } from "./fieldRegistry.ts";

export function validateAwbForIssue(fields: AwbExtractedField[]) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const invalidFields = REQUIRED_AWB_FIELD_KEYS.flatMap((key) => {
    const field = byKey.get(key);
    if (field && !field.value.trim()) {
      return [{
        key,
        label: field.label,
        message: "Required value is missing.",
      }];
    }
    return [];
  });
  const warningFields = fields
    .filter((field) => field.status === "warning")
    .map((field) => ({ key: field.key, label: field.label }));
  const unreviewedFields = fields
    .filter(
      (field) =>
        field.value.trim() &&
        (field.needsReview ||
          field.status === "review" ||
          field.status === "warning")
    )
    .map((field) => ({
      key: field.key,
      label: field.label,
      message: "This flagged value has not been reviewed.",
    }));
  return {
    invalidFields: [
      ...invalidFields,
      ...unreviewedFields.filter(
        (field) => !invalidFields.some((invalid) => invalid.key === field.key)
      ),
    ],
    warningFields,
    unreviewedFields,
  };
}
