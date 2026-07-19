import type { ReactNode } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatAdminStatusLabel, getAdminConfidenceTone, getAdminStatusTone } from "@/lib/admin/status";
import type { AdminSemanticTone } from "@/lib/admin/types";

export function AdminPageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className="admin-page-header"><div><h1>{title}</h1><p>{description}</p></div>{actions ? <div className="admin-page-actions">{actions}</div> : null}</header>;
}

export function AdminMetricCard({ label, value, note, tooltip, tone = "info", trend }: { label: string; value: string; note: string; tooltip?: string; tone?: AdminSemanticTone | "blue" | "cyan" | "violet" | "green" | "amber" | "red"; trend?: "up" | "down" }) {
  return <article className={`admin-metric-card tone-${tone}`}><div className="admin-metric-label">{label}</div><div className="admin-metric-value">{value}</div><div className="admin-metric-note" title={tooltip}>{trend === "up" ? <ArrowUpRight size={12} /> : trend === "down" ? <ArrowDownRight size={12} /> : null}{note}</div></article>;
}

export function AdminCard({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`admin-card ${className}`}><header className="admin-card-header"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>{action}</header><div className="admin-card-body">{children}</div></section>;
}

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = getAdminStatusTone(status);
  return <span className={`admin-badge admin-badge-${tone}`}>{formatAdminStatusLabel(status)}</span>;
}

export function AdminConfidenceBadge({ value }: { value: number }) {
  const tone = getAdminConfidenceTone(value);
  return <span className={`admin-badge admin-badge-${tone}`}>{value}%</span>;
}

export function AdminFilterBar({ children }: { children: ReactNode }) { return <div className="admin-filter-bar">{children}</div>; }
export function AdminTableWrap({ children }: { children: ReactNode }) { return <div className="admin-table-wrap">{children}</div>; }
export function AdminPagination({ label }: { label: string }) { return <div className="admin-pagination"><span>{label}</span><div><button disabled aria-label="Previous page">‹</button><button aria-label="Next page">›</button></div></div>; }
export function AdminEmptyState({ title = "No data available", description = "Try changing the selected filters." }: { title?: string; description?: string }) { return <div className="admin-empty-state"><AlertTriangle size={22} /><strong>{title}</strong><span>{description}</span></div>; }
export function AdminUnavailableNotice({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <div className="admin-unavailable-notice"><AlertTriangle size={18}/><div><strong>{title}</strong><p>{description}</p>{children}</div></div>; }
export function AdminResultSummary({ children }: { children: ReactNode }) { return <span className="admin-result-summary" aria-live="polite">{children}</span>; }
export function CorrectionDiff({ before, after }: { before: string; after: string }) { return <span className="admin-diff"><del>{before}</del><ins>{after}</ins></span>; }
