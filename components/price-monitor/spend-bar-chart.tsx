"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatSEK, type SpendBySupplier } from "@/lib/price-monitor-api";

interface SpendBarChartProps {
  suppliers: SpendBySupplier[];
}

export function SpendBarChart({ suppliers }: SpendBarChartProps) {
  const topSuppliers = [...suppliers]
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 10)
    .map((supplier) => ({
      name: supplier.supplier_name,
      spend: supplier.total_spend,
    }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={topSuppliers} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
        <XAxis type="number" tickFormatter={(value: number) => formatSEK(value)} stroke="#71717A" tick={{ fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={110} stroke="#71717A" tick={{ fill: '#A1A1AA' }} tickLine={false} axisLine={false} />
        <Tooltip 
          formatter={(value: number) => formatSEK(value)} 
          contentStyle={{
            backgroundColor: '#18181B',
            border: '1px solid #3F3F46',
            borderRadius: '8px',
            color: '#FFFFFF',
          }}
        />
        <Bar dataKey="spend" fill="#D946EF" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
