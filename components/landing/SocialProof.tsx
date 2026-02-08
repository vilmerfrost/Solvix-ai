"use client";

import { Activity, ShieldCheck, Server, Clock } from "lucide-react";

export function SocialProof() {
  const metrics = [
    {
      label: "TOTAL DOKUMENT",
      value: "1.2M+",
      desc: "Processade Q4 2025",
      icon: <Server className="w-4 h-4" />
    },
    {
      label: "UPPTID (SLA)",
      value: "99.99%",
      desc: "Enterprise-grade",
      icon: <Activity className="w-4 h-4" />
    },
    {
      label: "DATA PRECISION",
      value: "99.8%",
      desc: "Med human-loop option",
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      label: "SNITT-TID",
      value: "0.2s",
      desc: "API Latency",
      icon: <Clock className="w-4 h-4" />
    }
  ];

  return (
    <section className="bg-white border-b border-neutral-200">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-200 border-x border-neutral-200">
          {metrics.map((metric, i) => (
            <div key={i} className="p-8 group hover:bg-neutral-50 transition-colors">
              <div className="flex items-center justify-between mb-4 text-neutral-400 group-hover:text-neutral-900 transition-colors">
                <span className="font-mono text-xs font-bold tracking-wider">{metric.label}</span>
                {metric.icon}
              </div>
              <div className="font-mono text-4xl font-bold text-neutral-900 mb-2 tracking-tighter">
                {metric.value}
              </div>
              <div className="text-xs font-mono text-neutral-500 uppercase tracking-wide">
                {metric.desc}
              </div>
            </div>
          ))}
        </div>
        
        {/* Trusted By Ticker - Minimalist */}
        <div className="border-t border-neutral-200 py-6 overflow-hidden bg-neutral-50">
          <div className="flex gap-16 animate-[scroll_30s_linear_infinite] whitespace-nowrap opacity-60 grayscale">
            {["Nordfrakt", "Schenker", "DHL", "PostNord", "Bring", "DSV", "Kuehne+Nagel", "Nordfrakt", "Schenker", "DHL"].map((brand, i) => (
              <span key={i} className="text-xl font-bold text-neutral-400 font-sans tracking-tight">{brand}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
