export function createAwbBrowserPerformanceId() {
  return crypto.randomUUID();
}

export function awbBrowserPerformanceNow() {
  return performance.now();
}
