"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-32 px-6 bg-neutral-900 text-white relative overflow-hidden">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[0.9]">
          REDO ATT <span className="text-neutral-500">AUTOMATISERA?</span>
        </h2>
        <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
          Sluta slösa tid på manuell datainmatning. Bli en del av de logistikföretag som väljer effektivitet.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/signup"
            className="bg-white text-neutral-900 px-10 py-5 text-lg font-bold tracking-wide hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 group"
          >
            SKAPA KONTO GRATIS
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="mailto:sales@solvix.ai"
            className="px-10 py-5 text-lg font-bold tracking-wide border-2 border-neutral-700 text-white hover:border-white transition-all hover:bg-white/5"
          >
            BOKA TEKNISK DEMO
          </Link>
        </div>
      </div>
    </section>
  );
}
