import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  size?: "compact" | "standard";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", size = "standard", ...props },
  ref
) {
  const height =
    size === "compact"
      ? "h-[var(--semlox-control-compact)]"
      : "h-[var(--semlox-control-standard)]";
  const typography = size === "compact" ? "semlox-table-body" : "semlox-input-text";

  return (
    <input
      ref={ref}
      className={`${typography} w-full rounded-[var(--semlox-radius-control)] border border-[var(--semlox-interactive-border)] bg-[var(--semlox-interactive-surface)] px-3 text-[var(--semlox-text-primary)] outline-none transition-colors placeholder:text-[var(--semlox-text-muted)] hover:border-[var(--semlox-color-primary)]/30 focus:border-[var(--semlox-color-primary)] focus:bg-[var(--semlox-interactive-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semlox-color-primary)] disabled:cursor-not-allowed disabled:text-[var(--semlox-text-disabled)] disabled:opacity-70 ${height} ${className}`}
      {...props}
    />
  );
});
