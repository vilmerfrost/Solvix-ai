"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatSEK, type SpendByCategory } from "@/lib/price-monitor-api";

const FALLBACK_COLORS = [
  '#EC4899',  // pink-500 (primary)
  '#8B5CF6',  // violet-500
  '#06B6D4',  // cyan-500
  '#F59E0B',  // amber-500
  '#10B981',  // emerald-500
  '#F472B6',  // pink-400
  '#A78BFA',  // violet-400
  '#22D3EE',  // cyan-400
];

interface SpendDonutChartProps {
  categories: SpendByCategory[];
}

export function SpendDonutChart({ categories }: SpendDonutChartProps) {
  const categoryData = (categories ?? []).map((category) => ({
    name: category?.category_name ?? "",
    value: Number(category?.total_spend) || 0,
    color: category?.color ?? null,
  })).filter((d) => d.value > 0);

  if (categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-sm" style={{ color: "var(--color-text-muted)" }}>
        Ingen kategoridata att visa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={categoryData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {categoryData.map((entry, index) => (
            <Cell
              key={`${entry.name}-${index}`}
              fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => formatSEK(value)} 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            color: '#111827',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
