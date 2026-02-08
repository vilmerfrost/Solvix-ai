"use client";

import { Upload, Lock, Zap, Shield } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-40 pb-20 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-slate-900">
          Förvandla kaotiska följesedlar till{" "}
          <span className="text-[#4A90E2]">ren Excel</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
          Spara timmar på manuell datainmatning med AI-driven extrahering
          anpassad för nordisk logistik och återvinning.
        </p>

        {/* Upload Zone */}
        <div className="max-w-2xl mx-auto mb-8">
          <Link
            href="/signup"
            className="block border-2 border-dashed border-[#4A90E2]/30 bg-[#F0F7FF] rounded-xl p-12 group cursor-pointer hover:border-[#4A90E2] hover:shadow-md transition-all"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-[#4A90E2]">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">
                  Ladda upp följesedel
                </p>
                <p className="text-sm text-slate-500">
                  Dra och släpp dina PDF:er eller bilder här
                </p>
              </div>
              <button className="mt-4 bg-white border border-slate-200 px-6 py-2 rounded-lg text-sm font-bold hover:shadow-md transition-all">
                Välj filer
              </button>
            </div>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-slate-700">
              Krypterad data
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
            <Zap className="w-5 h-5 text-[#4A90E2]" />
            <span className="text-sm font-medium text-slate-700">
              30 sek resultat
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
            <Lock className="w-5 h-5 text-[#4A90E2]" />
            <span className="text-sm font-medium text-slate-700">
              Inget kreditkort
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
