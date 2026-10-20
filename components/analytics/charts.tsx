"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BAR = "#22d3ee";
const GRID = "rgba(148, 163, 184, 0.15)";
const TICK = { fill: "#94a3b8", fontSize: 12 };
const CURSOR = { fill: "rgba(34, 211, 238, 0.08)" };

type TooltipProps = {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
};

function ChartTooltip({ active, payload, label, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background/95 px-3 py-2 text-xs">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

export function CompletedChart({ data }: { data: { label: string; completed: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tick={TICK}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={CURSOR} content={<ChartTooltip unit="completed" />} />
          <Bar dataKey="completed" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WorkloadChart({ data }: { data: { name: string; open: number }[] }) {
  const height = Math.max(120, data.length * 44);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={150} />
          <Tooltip cursor={CURSOR} content={<ChartTooltip unit="open tasks" />} />
          <Bar dataKey="open" fill={BAR} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}