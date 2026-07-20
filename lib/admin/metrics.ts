// @ts-expect-error Node's strip-types test runner requires explicit TypeScript extensions.
import { normalizeAwbComparisonValue } from "../awb/finalQualityMetrics.ts";

export const EDITED_FIELDS_LABEL = "Fields Different from AI Output";
export const EDITED_FIELDS_TOOLTIP = "Counts fields whose current stored value differs from the original AI-extracted value. This is not a historical correction-event count.";

export function isFieldDifferentFromAiOutput(currentValue: unknown, originalValue: unknown) {
  return normalizeAwbComparisonValue(currentValue) !== normalizeAwbComparisonValue(originalValue);
}

export function boundedPercent(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 1000) / 10));
}

export function validConfidencePercentages(values: Array<number | string | null | undefined>) {
  return values
    .map((value) => value === null || value === undefined ? Number.NaN : Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1)
    .map((value) => value * 100);
}

export function validProcessingTimes(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function countByStatus(rows: Array<{ status: string }>) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return counts;
}
