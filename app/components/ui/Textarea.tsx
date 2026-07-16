import { forwardRef, type TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={`semlox-input-text min-h-[72px] w-full resize-y rounded-[var(--semlox-radius-control)] border border-[var(--semlox-interactive-border)] bg-[var(--semlox-interactive-surface)] px-3 py-2.5 text-[var(--semlox-text-primary)] outline-none transition-colors placeholder:text-[var(--semlox-text-muted)] hover:border-[var(--semlox-color-primary)]/30 focus:border-[var(--semlox-color-primary)] focus:bg-[var(--semlox-interactive-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semlox-color-primary)] disabled:cursor-not-allowed disabled:text-[var(--semlox-text-disabled)] disabled:opacity-70 ${className}`}
      {...props}
    />
  );
});
