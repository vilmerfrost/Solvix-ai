"use client";

import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-24 px-6 text-center bg-white">
      <div className="max-w-4xl mx-auto bg-[#4A90E2] rounded-3xl p-16 text-white shadow-2xl shadow-[#4A90E2]/30">
        <h2 className="text-4xl font-black mb-6">
          Sluta mata in data manuellt
        </h2>
        <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto">
          Bli en del av hundratals logistikföretag som redan har effektiviserat
          sin administration med Vextra.ai.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-white text-[#4A90E2] px-8 py-4 rounded-xl font-black text-lg hover:scale-105 transition-transform"
          >
            Kom igång gratis
          </Link>
          <Link
            href="mailto:sales@vextra.ai"
            className="bg-[#4A90E2]/20 border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#4A90E2]/30 transition-colors"
          >
            Boka en demo
          </Link>
        </div>
      </div>
    </section>
  );
}
