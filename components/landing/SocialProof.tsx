"use client";

import { TrendingUp } from "lucide-react";

export function SocialProof() {
  return (
    <section className="bg-[#F0F7FF] py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-xl border border-[#4A90E2]/10 shadow-sm">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
              Noggrannhet
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 leading-none">
                97%
              </span>
              <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +2.4%
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-500 italic">
              "Betydligt mer exakt än våra tidigare manuella processer."
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#4A90E2]/10 shadow-sm">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
              Genomsnittlig tid
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 leading-none">
                30s
              </span>
              <span className="text-[#4A90E2] text-sm font-bold">-85% tid</span>
            </div>
            <p className="mt-4 text-sm text-slate-500 italic">
              Snabbare än att ens öppna en PDF manuellt.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#4A90E2]/10 shadow-sm">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
              Tidsbesparing
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 leading-none">
                4h+
              </span>
              <span className="text-green-600 text-sm font-bold">per vecka</span>
            </div>
            <p className="mt-4 text-sm text-slate-500 italic">
              Frigör tid för kärnverksamheten.
            </p>
          </div>
        </div>

        {/* Testimonial */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xl font-medium leading-relaxed italic text-slate-700 mb-6">
            "Vextra har förändrat hur vi hanterar våra inkommande fraktsedlar.
            Det som tidigare tog en förmiddag varje måndag sker nu automatiskt
            på några minuter."
          </p>
          <div>
            <p className="font-bold text-slate-900">Anders Svensson</p>
            <p className="text-sm text-slate-500">Logistikansvarig, Nordfrakt AB</p>
          </div>
        </div>
      </div>
    </section>
  );
}
