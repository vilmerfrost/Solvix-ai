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

  for (const row of monthly) {
    grouped.set(row.month, (grouped.get(row.month) ?? 0) + row.total_spend);
  }

  const monthlyData = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, spend]) => ({
      month: new Intl.DateTimeFormat("sv-SE", {
        month: "short",
        year: "numeric",
      }).format(new Date(month)),
      spend,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={monthlyData}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(value: number) => formatSEK(value)} />
        <Area
          type="monotone"
          dataKey="spend"
          stroke="#3B82F6"
          fill="url(#spendGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
