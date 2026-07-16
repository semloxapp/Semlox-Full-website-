import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";
type BadgeSize = "small" | "standard";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-[var(--semlox-status-neutral-border)] bg-[var(--semlox-status-neutral-bg)] text-[var(--semlox-status-neutral-text)]",
  info: "border-[var(--semlox-status-info-border)] bg-[var(--semlox-status-info-bg)] text-[var(--semlox-status-info-text)]",
  success: "border-[var(--semlox-status-success-border)] bg-[var(--semlox-status-success-bg)] text-[var(--semlox-status-success-text)]",
  warning: "border-[var(--semlox-status-warning-border)] bg-[var(--semlox-status-warning-bg)] text-[var(--semlox-status-warning-text)]",
  danger: "border-[var(--semlox-status-danger-border)] bg-[var(--semlox-status-danger-bg)] text-[var(--semlox-status-danger-text)]",
};

const sizeClasses: Record<BadgeSize, string> = {
  small: "px-2 py-1",
  standard: "px-2.5 py-1",
};

export function Badge({
  className = "",
  variant = "neutral",
  size = "small",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`semlox-badge-text inline-flex items-center gap-1 rounded-[var(--semlox-radius-pill)] border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
