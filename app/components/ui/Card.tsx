import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--semlox-radius-card)] border border-[var(--semlox-interactive-border)] bg-[var(--semlox-interactive-surface)] ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}
