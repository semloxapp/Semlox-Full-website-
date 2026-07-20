export type PersistedAwbFieldValue = {
  key: string;
  value: string | null;
  original_value: string | null;
};

export type SubmittedAwbFieldValue = {
  key: string;
  value: string;
};

export function replaceSubmittedAwbFieldValue<T extends SubmittedAwbFieldValue>(
  fields: T[],
  key: string,
  value: string
): T[] {
  return fields.map((field) =>
    field.key === key ? { ...field, value } : field
  );
}

export function displayAwbFieldValue(field: PersistedAwbFieldValue) {
  return field.value ?? field.original_value ?? "";
}

export function verifySubmittedAwbFieldValues(
  submitted: SubmittedAwbFieldValue[],
  persisted: PersistedAwbFieldValue[]
) {
  const persistedByKey = new Map(persisted.map((field) => [field.key, field]));
  return submitted.every(
    (field) => persistedByKey.get(field.key)?.value === field.value.trim()
  );
}

export function countCorrectedAwbFieldValues(fields: PersistedAwbFieldValue[]) {
  return fields.filter(
    (field) =>
      String(field.original_value ?? "").trim() !==
      String(field.value ?? "").trim()
  ).length;
}
