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
  const topSuppliers = [...(suppliers ?? [])]
    .filter((s) => s && (Number(s.total_spend) || 0) > 0)
    .sort((a, b) => (b?.total_spend ?? 0) - (a?.total_spend ?? 0))
    .slice(0, 10)
    .map((supplier) => ({
      name: supplier?.supplier_name ?? "",
      spend: Number(supplier?.total_spend) || 0,
    }));

  if (topSuppliers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-sm" style={{ color: "var(--color-text-muted)" }}>
        Ingen leverantörsdata att visa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={topSuppliers} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis type="number" tickFormatter={(value: number) => formatSEK(value)} stroke="#E5E7EB" tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" width={110} stroke="#E5E7EB" tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
        <Tooltip 
          formatter={(value: number) => formatSEK(value)} 
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            color: '#111827',
          }}
        />
        <Bar dataKey="spend" fill="#EC4899" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
