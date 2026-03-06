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
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

interface SpendDonutChartProps {
  categories: SpendByCategory[];
}

export function SpendDonutChart({ categories }: SpendDonutChartProps) {
  const categoryData = categories.map((category) => ({
    name: category.category_name,
    value: category.total_spend,
    color: category.color,
  }));

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
        <Tooltip formatter={(value: number) => formatSEK(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
