"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { AdminSemanticTone } from "@/lib/admin/types";

type ChartDatum = Record<string, string | number>;
type Unit = "count" | "percent" | "seconds";
type TooltipEntry = { value?: string | number; name?: string; color?: string; payload?: ChartDatum };

const semanticColor: Record<AdminSemanticTone, string> = { info: "var(--admin-info-strong)", success: "var(--admin-success-strong)", warning: "var(--admin-warning-strong)", partial: "var(--admin-partial-strong)", danger: "var(--admin-danger-strong)", neutral: "var(--admin-neutral-strong)" };
const confidenceColors: Record<string, string> = {
  "Very Low": "var(--admin-danger-strong)", Low: "var(--admin-partial-strong)",
  Moderate: "var(--admin-warning-strong)", Good: "var(--admin-success-strong)", High: "var(--admin-info-strong)",
};

function formatValue(value: number, unit: Unit) {
  if (unit === "percent") return `${value}%`;
  if (unit === "seconds") return `${value}s`;
  return `${value}`;
}

function AxisLabel({ value }: { value: string }) {
  return <span className="admin-axis-label">{value}</span>;
}

function AdminChartTooltip({ active, payload, label, unit, valueLabel, tooltipNote }: {
  active?: boolean; payload?: TooltipEntry[]; label?: string | number; unit: Unit;
  valueLabel?: string; tooltipNote?: (item: ChartDatum) => string | undefined;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  const note = item ? tooltipNote?.(item) : undefined;
  return <div className="admin-chart-tooltip">
    {label !== undefined ? <strong>{String(label)}</strong> : null}
    <div className="admin-chart-tooltip-values">
      {payload.map((entry, index) => <span key={`${entry.name ?? valueLabel ?? "value"}-${index}`}>
        <i style={{ background: entry.color ?? "var(--admin-chart-1)" }}/>
        <em>{entry.name ?? valueLabel ?? "Value"}</em>
        <b>{formatValue(Number(entry.value ?? 0), unit)}</b>
      </span>)}
    </div>
    {note ? <small>{note}</small> : null}
  </div>;
}

export function AdminQualityChart({ data }: { data: ChartDatum[] }) {
  return <div className="admin-chart-block">
    <div className="admin-chart-topline"><div className="admin-chart-legend" aria-label="Chart legend"><span><i style={{ background: "var(--admin-chart-1)" }}/>Average confidence</span><span><i style={{ background: "var(--admin-partial-strong)" }}/>Current-difference rate</span></div></div>
    <div className="admin-chart admin-chart-standard">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={210}>
        <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--admin-border)" vertical={false}/>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/>
          <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/>
          <Tooltip content={<AdminChartTooltip unit="percent"/>}/>
          <Line name="Average confidence" type="monotone" dataKey="confidence" stroke="var(--admin-chart-1)" strokeWidth={2} dot={false}/>
          <Line name="Current-difference rate" type="monotone" dataKey="correction" stroke="var(--admin-partial-strong)" strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="admin-chart-axis"><AxisLabel value="X: Document created date"/><AxisLabel value="Y: Percentage (%)"/></div>
  </div>;
}

export function AdminBarChart({
  data, dataKey = "value", labelKey = "name", horizontal = false, unit = "count",
  categoryLabel = "Category", valueLabel = "Value", semantic = false, tooltipNote,
}: {
  data: ChartDatum[]; dataKey?: string; labelKey?: string; horizontal?: boolean; unit?: Unit;
  categoryLabel?: string; valueLabel?: string; semantic?: boolean;
  tooltipNote?: (item: ChartDatum) => string | undefined;
}) {
  const height = horizontal ? Math.max(190, data.length * 32 + 34) : 210;
  const highest = data.length ? Math.max(...data.map((item) => Number(item[dataKey]))) : 0;
  return <div className="admin-chart-block">
    <div className="admin-chart-topline"><span>{data.length} categories</span><strong>Highest <b>{formatValue(highest, unit)}</b></strong></div>
    <div className="admin-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={height}>
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={horizontal ? { top: 4, right: 54, left: 8, bottom: 4 } : { top: 20, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--admin-border)" horizontal={!horizontal} vertical={horizontal}/>
          {horizontal
            ? <><XAxis type="number" unit={unit === "percent" ? "%" : unit === "seconds" ? "s" : undefined} tick={{ fontSize: 9, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/><YAxis type="category" dataKey={labelKey} width={142} tick={{ fontSize: 9, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/></>
            : <><XAxis dataKey={labelKey} tick={{ fontSize: 9, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/><YAxis unit={unit === "percent" ? "%" : unit === "seconds" ? "s" : undefined} tick={{ fontSize: 9, fill: "var(--admin-muted)" }} axisLine={false} tickLine={false}/></>}
          <Tooltip
            cursor={{ fill: "transparent", stroke: "var(--admin-border-strong)", strokeWidth: 1 }}
            content={<AdminChartTooltip unit={unit} valueLabel={valueLabel} tooltipNote={tooltipNote}/>}
          />
          <Bar dataKey={dataKey} name={valueLabel} fill="var(--admin-chart-1)" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
            {semantic ? data.map((item, index) => <Cell key={`${String(item[labelKey]) || "bucket"}-${index}`} fill={confidenceColors[String(item[labelKey]).split(" (")[0]] ?? "var(--admin-chart-1)"}/>) : null}
            <LabelList dataKey={dataKey} position={horizontal ? "right" : "top"} formatter={(value: unknown) => formatValue(Number(value), unit)} fill="var(--admin-text-2)" fontSize={9}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="admin-chart-axis"><AxisLabel value={`${horizontal ? "Y" : "X"}: ${categoryLabel}`}/><AxisLabel value={`${horizontal ? "X" : "Y"}: ${valueLabel}${unit === "percent" ? " (%)" : unit === "seconds" ? " (seconds)" : ""}`}/></div>
    {!data.length ? <p className="admin-chart-summary">No chart data is available.</p> : null}
  </div>;
}

export function AdminDonutChart({ data, totalLabel = "Items" }: { data: Array<{ name: string; value: number; tone?: AdminSemanticTone }>; totalLabel?: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return <div className="admin-donut-layout">
    <div className="admin-donut-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="61%" outerRadius="82%" paddingAngle={2} stroke="var(--admin-surface)" strokeWidth={2}>
            {data.map((item, index) => <Cell key={`${item.name || "status"}-${index}`} fill={item.tone ? semanticColor[item.tone] : "var(--admin-chart-1)"}/>)}
          </Pie>
          <Tooltip content={<AdminChartTooltip unit="count" valueLabel={totalLabel} tooltipNote={(item) => {
            const count = Number(item.value ?? 0);
            return `${total ? (count / total * 100).toFixed(1) : "0.0"}% of ${total} ${totalLabel.toLowerCase()}`;
          }}/>}/>
        </PieChart>
      </ResponsiveContainer>
      <div className="admin-donut-center"><strong>{total}</strong><span>{totalLabel}</span></div>
    </div>
    <div className="admin-donut-legend" aria-label={`${totalLabel} distribution legend`}>
      <header><span>Status</span><strong>Value</strong></header>
      {data.map((item, index) => {
        const percentage = total ? (item.value / total * 100).toFixed(1) : "0.0";
        const color = item.tone ? semanticColor[item.tone] : "var(--admin-chart-1)";
        return <div key={`${item.name || "status"}-legend-${index}`}><i style={{ background: color }}/><span>{item.name || "Unavailable"}</span><strong>{item.value}<small>{percentage}%</small></strong></div>;
      })}
    </div>
    <p className="admin-chart-summary">{total} total {totalLabel.toLowerCase()} across {data.length} mutually exclusive categories.</p>
  </div>;
}
