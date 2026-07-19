import "server-only";

export function formatAdminStatusLabel(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function roundAdminRate(value: number) {
  return Math.round(value * 10) / 10;
}

export function clampAdminPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
