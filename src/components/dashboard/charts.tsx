"use client";

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Paleta de cores padrão UrbanDesk
// ─────────────────────────────────────────────
export const CHART_COLORS = {
  brand:   "#3468f6",
  accent:  "#10b981",
  warning: "#f59e0b",
  danger:  "#ef4444",
  violet:  "#7c3aed",
  slate:   "#94a3b8",
};

// ─────────────────────────────────────────────
// Tooltip customizado compartilhado
// ─────────────────────────────────────────────
function BaseTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-map text-xs min-w-[120px]">
      {label && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
          <span className="font-medium text-foreground tabular-num">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 1. AreaChart — evolução temporal
// ─────────────────────────────────────────────
interface AreaSeriesProps {
  dataKey: string;
  name:    string;
  color:   string;
  dashed?: boolean;
}

interface UrbanAreaChartProps {
  data:       Record<string, any>[];
  xKey:       string;
  series:     AreaSeriesProps[];
  height?:    number;
  formatter?: (v: number, name: string) => string;
  className?: string;
}

export function UrbanAreaChart({
  data, xKey, series, height = 220, formatter, className,
}: UrbanAreaChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.dataKey} id={`area-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={s.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<BaseTooltip formatter={formatter} />} />
          <Legend
            iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              fill={`url(#area-${s.dataKey})`}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: s.color }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────
// 2. BarChart — comparativo
// ─────────────────────────────────────────────
interface UrbanBarChartProps {
  data:       Record<string, any>[];
  xKey:       string;
  series:     { dataKey: string; name: string; color: string }[];
  height?:    number;
  horizontal?: boolean;
  formatter?: (v: number, name: string) => string;
  className?: string;
}

export function UrbanBarChart({
  data, xKey, series, height = 220, horizontal = false, formatter, className,
}: UrbanBarChartProps) {
  const Chart   = BarChart;
  const XComp   = horizontal ? YAxis : XAxis;
  const YComp   = horizontal ? XAxis : YAxis;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 4, bottom: 0, left: horizontal ? 80 : -20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={!horizontal} vertical={horizontal} />
          <XAxis
            dataKey={horizontal ? undefined : xKey}
            type={horizontal ? "number" : "category"}
            tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            dataKey={horizontal ? xKey : undefined}
            type={horizontal ? "category" : "number"}
            tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }}
            axisLine={false} tickLine={false}
            width={horizontal ? 80 : undefined}
          />
          <Tooltip content={<BaseTooltip formatter={formatter} />} cursor={{ fill: "hsl(214 32% 96%)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {series.map((s) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color} radius={[3,3,0,0]} maxBarSize={40} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────
// 3. LineChart — série temporal simples
// ─────────────────────────────────────────────
interface UrbanLineChartProps {
  data:       Record<string, any>[];
  xKey:       string;
  series:     { dataKey: string; name: string; color: string; dashed?: boolean }[];
  height?:    number;
  formatter?: (v: number, name: string) => string;
  className?: string;
}

export function UrbanLineChart({
  data, xKey, series, height = 200, formatter, className,
}: UrbanLineChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize:11, fill:"hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize:11, fill:"hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<BaseTooltip formatter={formatter} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, paddingTop:8 }} />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              dot={false}
              activeDot={{ r:4, fill:s.color, strokeWidth:2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────
// 4. DonutChart — distribuição por categoria
// ─────────────────────────────────────────────
interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface UrbanDonutChartProps {
  data:      DonutSlice[];
  size?:     number;
  label?:    string;
  sublabel?: string;
  className?: string;
}

export function UrbanDonutChart({
  data, size = 160, label, sublabel, className,
}: UrbanDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.34}
              outerRadius={size * 0.48}
              dataKey="value"
              stroke="none"
              paddingAngle={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-map text-xs">
                    <p className="font-medium text-foreground">{d.name}</p>
                    <p className="text-muted-foreground tabular-num">
                      {d.value} · {((Number(d.value) / total) * 100).toFixed(1)}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Label central */}
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="font-display text-xl font-800 text-foreground leading-none">{label}</p>
            {sublabel && <p className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</p>}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="mt-3 w-full space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.label}</span>
            </div>
            <div className="flex items-center gap-2 tabular-num">
              <span className="text-foreground font-medium">{d.value}</span>
              <span className="text-muted-foreground/60">
                {((d.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 5. ProgressList — barras de progresso listadas
// ─────────────────────────────────────────────
interface ProgressItem {
  label: string;
  value: number;
  max?:  number;
  color?: string;
  sub?:  string;
}

interface ProgressListProps {
  items:     ProgressItem[];
  className?: string;
}

export function ProgressList({ items, className }: ProgressListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = Math.min(100, ((item.value / (item.max ?? 100)) * 100));
        const color = item.color ?? CHART_COLORS.brand;
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-foreground">{item.label}</span>
                {item.sub && <span className="ml-1.5 text-muted-foreground">{item.sub}</span>}
              </div>
              <span className="tabular-num text-muted-foreground font-medium">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
