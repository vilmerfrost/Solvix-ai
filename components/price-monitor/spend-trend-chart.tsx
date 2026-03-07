"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSEK, type SpendMonthly } from "@/lib/price-monitor-api";

interface SpendTrendChartProps {
  monthly: SpendMonthly[];
}

export function SpendTrendChart({ monthly }: SpendTrendChartProps) {
  const grouped = new Map<string, number>();

  for (const row of monthly ?? []) {
    if (row?.month != null) {
      grouped.set(row.month, (grouped.get(row.month) ?? 0) + (Number(row.total_spend) || 0));
    }
  }

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    year: "numeric",
  });
  const monthlyData = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, spend]) => {
      const parsedDate = new Date(month);
      const label = Number.isNaN(parsedDate.getTime()) ? month : formatter.format(parsedDate);
      return { month: label, spend };
    });

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm" style={{ color: "var(--color-text-muted)" }}>
        Ingen månadsdata att visa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={monthlyData}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="month" stroke="#E5E7EB" tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`} stroke="#E5E7EB" tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <Tooltip 
          formatter={(value: number) => formatSEK(value)} 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            color: '#111827',
          }}
        />
        <Area
          type="monotone"
          dataKey="spend"
          stroke="#EC4899"
          strokeWidth={2}
          fill="url(#spendGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
