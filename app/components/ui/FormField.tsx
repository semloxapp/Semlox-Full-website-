import type { HTMLAttributes, ReactNode } from "react";

export type FormFieldProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  label: string;
  description: string;
  htmlFor: string;
  descriptionId?: string;
  children: ReactNode;
};

export function FormField({
  label,
  description,
  htmlFor,
  descriptionId,
  children,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 border-t border-[var(--semlox-interactive-border)] py-3 first:border-t-0 md:grid-cols-[190px_minmax(0,1fr)] md:gap-6 ${className}`}
      {...props}
    >
      <div>
        <label className="semlox-label text-[var(--semlox-text-primary)]" htmlFor={htmlFor}>
          {label}
        </label>
        <p id={descriptionId} className="semlox-metadata mt-1">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
