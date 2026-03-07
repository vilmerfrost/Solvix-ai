"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { PriceHistory, formatSEK, formatDate } from "@/lib/price-monitor-api";

interface PriceChartProps {
  data: PriceHistory[];
}

interface TooltipPayload {
  payload?: PriceHistory & { date: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-3 text-sm shadow-lg text-gray-900"
      style={{
        minWidth: 180,
      }}
    >
      <p className="font-semibold mb-1 text-gray-900">
        {d.date}
      </p>
      <div className="space-y-0.5 text-gray-500">
        <p>Enhetspris: <span className="font-medium text-gray-900">{formatSEK(d.unit_price)}</span></p>
        <p>Antal: <span className="font-medium text-gray-900">{d.quantity}</span></p>
        {d.invoice_number && (
          <p>Faktura: <span className="font-medium text-gray-900">{d.invoice_number}</span></p>
        )}
      </div>
    </div>
  );
}

export function PriceChart({ data }: PriceChartProps) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
  );

  const chartData = sorted.map((d) => ({
    ...d,
    date: formatDate(d.invoice_date),
    unit_price: d.unit_price,
  }));

  const avg =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.unit_price, 0) / chartData.length
      : 0;

  const minPrice = Math.min(...chartData.map((d) => d.unit_price));
  const maxPrice = Math.max(...chartData.map((d) => d.unit_price));
  const padding = (maxPrice - minPrice) * 0.1 || 10;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#F3F4F6"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          tick={{ fontSize: 11, fill: "#6B7280" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(v)
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            label={{
              value: `Snitt: ${formatSEK(avg)}`,
              position: "insideTopRight",
              fontSize: 11,
              fill: "#6B7280",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="unit_price"
          stroke="#EC4899"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={{ r: 3, fill: "#EC4899", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#EC4899" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
