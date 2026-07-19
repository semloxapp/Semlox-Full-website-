const display = (value: string | null) => value === null ? "Null" : value === "" ? "Empty value" : value;

export function CurrentDifferenceDiff({ original, current, compact = false }: { original: string | null; current: string | null; compact?: boolean }) {
  return <div className={`admin-current-diff${compact ? " admin-current-diff-compact" : ""}`}>
    <div><span>Original AI Output</span><del title={display(original)}>{display(original)}</del></div>
    <div><span>Current Stored Value</span><ins title={display(current)}>{display(current)}</ins></div>
  </div>;
}
