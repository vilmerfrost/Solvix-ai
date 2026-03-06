"use client";

import { useState } from "react";

interface ConfidenceDotProps {
  value: number; // 0–1
}

export function ConfidenceDot({ value }: ConfidenceDotProps) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "#22c55e" : value >= 0.5 ? "#f59e0b" : "#ef4444";
  const label = value >= 0.8 ? "Hög" : value >= 0.5 ? "Medel" : "Låg";

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-default"
        style={{ background: color }}
      />
      {hovered && (
        <span
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap px-2 py-1 rounded-md text-xs font-medium shadow-lg pointer-events-none"
          style={{
            background: "var(--color-bg-elevated)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {label} konfidensgrad ({pct}%)
        </span>
      )}
    </span>
  );
}
