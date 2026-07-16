import { forwardRef, type SelectHTMLAttributes } from "react";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: "compact" | "standard";
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", size = "standard", ...props },
  ref
) {
  const height =
    size === "compact"
      ? "h-[var(--semlox-control-compact)]"
      : "h-[var(--semlox-control-standard)]";
  const typography = size === "compact" ? "semlox-table-body" : "semlox-input-text";

  return (
    <select
      ref={ref}
      className={`${typography} rounded-[var(--semlox-radius-control)] border border-[var(--semlox-interactive-border)] bg-[var(--semlox-interactive-surface)] px-3 outline-none transition-colors hover:border-[var(--semlox-color-primary)]/30 focus:border-[var(--semlox-color-primary)] focus:bg-[var(--semlox-interactive-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semlox-color-primary)] disabled:cursor-not-allowed disabled:text-[var(--semlox-text-disabled)] disabled:opacity-70 ${height} ${className}`}
      {...props}
    />
  );
});
