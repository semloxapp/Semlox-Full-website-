"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid rgba(148,163,184,0.24)",
  borderRadius: 8,
  color: "#f8fafc",
  fontSize: 11,
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};

const chartTick = {
  fontSize: 9,
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  fill: "#64748b",
};

const chartLegendStyle = {
  fontSize: 9,
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};

const tooltipLabelStyle = { fontWeight: 600 };

export function DashboardLineChart({
  data,
}: {
  data: Array<Record<string, string | number>>;
}) {
  if (!data.some((item) => Number(item.uploaded) > 0)) {
    return <EmptyChart />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="label" stroke="#64748b" tick={chartTick} />
        <YAxis allowDecimals={false} stroke="#64748b" tick={chartTick} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={chartLegendStyle} />
        <Line type="monotone" dataKey="uploaded" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="draft" stroke="#f59e0b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="issued" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardStatusDonut({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={2}
        >
          {data.map((item) => (
            <Cell key={item.name} fill={item.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={chartLegendStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TeamActivityBarChart({
  data,
}: {
  data: Array<Record<string, string | number | null>>;
}) {
  if (!data.some((item) => Number(item.uploaded) > 0)) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="name" stroke="#64748b" tick={chartTick} />
        <YAxis allowDecimals={false} stroke="#64748b" tick={chartTick} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={chartLegendStyle} />
        <Bar dataKey="uploaded" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="issued" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="drafts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="semlox-body flex h-[260px] items-center justify-center">
      No dashboard data yet.
    </div>
  );
}
