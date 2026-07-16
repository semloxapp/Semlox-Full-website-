import type { HTMLAttributes, ReactNode } from "react";

export type PageHeaderProps = HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  titleClassName = "",
  descriptionClassName = "",
  className = "",
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-start justify-between gap-3 ${className}`}
      {...props}
    >
      <div className="min-w-0">
        <h1 className={`semlox-page-title ${titleClassName}`}>
          {title}
        </h1>
        {description ? (
          <p className={`semlox-body mt-1 ${descriptionClassName}`}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
