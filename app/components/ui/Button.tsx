import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "solid" | "secondary" | "outline" | "ghost" | "danger" | "compactAction";
type ButtonSize = "toggle" | "compact" | "standard" | "large";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-r from-[#2f80ff] to-[#00b8e6] text-[var(--semlox-text-inverse)] transition-[background,filter] hover:brightness-110 active:brightness-95",
  solid: "border border-transparent bg-[#2f80ff] text-[var(--semlox-text-inverse)] transition-colors hover:bg-[#2674eb] active:bg-[#1f65d6]",
  secondary:
    "border border-[var(--semlox-interactive-border)] bg-[var(--semlox-interactive-surface)] text-[var(--semlox-text-secondary)] transition-colors hover:border-[var(--semlox-color-primary)]/40 hover:bg-[var(--semlox-interactive-hover)] hover:text-[var(--semlox-text-primary)] active:bg-[var(--semlox-interactive-active)]",
  outline:
    "border border-[var(--semlox-interactive-border)] bg-transparent text-[var(--semlox-text-secondary)] transition-colors hover:border-[var(--semlox-color-primary)]/40 hover:bg-[var(--semlox-interactive-hover)] hover:text-[var(--semlox-text-primary)] active:bg-[var(--semlox-interactive-active)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--semlox-text-muted)] transition-colors hover:bg-[var(--semlox-interactive-hover)] hover:text-[var(--semlox-text-primary)] active:bg-[var(--semlox-interactive-active)]",
  danger:
    "border border-[var(--semlox-status-danger-border)] bg-[var(--semlox-status-danger-bg)] text-[var(--semlox-status-danger-text)] transition-colors hover:border-[var(--semlox-status-danger-text)] hover:bg-[color-mix(in_srgb,var(--semlox-status-danger-bg),var(--semlox-status-danger-text)_8%)] active:bg-[color-mix(in_srgb,var(--semlox-status-danger-bg),var(--semlox-status-danger-text)_14%)]",
  compactAction:
    "border border-[var(--semlox-status-info-border)] bg-[var(--semlox-status-info-bg)] text-[var(--semlox-text-link)] transition-colors hover:border-[var(--semlox-text-link)] hover:bg-[var(--semlox-interactive-hover)] active:bg-[var(--semlox-interactive-active)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  toggle: "h-[var(--semlox-control-toggle)] rounded-[var(--semlox-radius-compact)] px-3",
  compact: "h-[var(--semlox-control-compact)] rounded-[var(--semlox-radius-compact)] px-3",
  standard: "h-[var(--semlox-control-standard)] rounded-[var(--semlox-radius-control)] px-3",
  large: "h-[var(--semlox-control-large)] rounded-[var(--semlox-radius-control)] px-4",
};

export function Button({
  className = "",
  variant = "secondary",
  size = "standard",
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`semlox-button-text inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semlox-color-primary)] disabled:cursor-not-allowed disabled:border-[var(--semlox-interactive-border)] disabled:bg-transparent disabled:text-[var(--semlox-text-disabled)] disabled:opacity-70 aria-busy:cursor-wait aria-busy:opacity-80 [&_svg]:h-[var(--semlox-icon-md)] [&_svg]:w-[var(--semlox-icon-md)] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
