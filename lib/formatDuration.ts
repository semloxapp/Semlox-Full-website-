export function formatDuration(milliseconds: number | null | undefined) {
  if (
    milliseconds === null ||
    milliseconds === undefined ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return "N/A";
  }

  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;

  if (milliseconds < 60_000) {
    const seconds = Math.round(milliseconds / 10) / 100;
    return `${seconds.toFixed(2).replace(/\.?0+$/, "")}s`;
  }

  const wholeSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(wholeSeconds / 60);
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return `${minutes}m ${String(wholeSeconds % 60).padStart(2, "0")}s`;
}
