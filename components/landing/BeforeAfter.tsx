"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import Link from "next/link";

export function BeforeAfter() {
  return (
    <section className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-[#00E599] uppercase tracking-wider">
            Se det i aktion
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] mt-3">
            Funkar även med era värsta dokument
          </h2>
        </motion.div>

        {/* Comparison cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Before card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="p-6 rounded-2xl bg-[#1A1A2E]/30 backdrop-blur-sm border border-[#FF6B35]/30 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <X className="w-5 h-5 text-[#FF6B35]" />
                <span className="text-lg font-semibold text-[#FF6B35]">
                  Före
                </span>
              </div>

              {/* Visual mockup of messy document */}
              <div className="relative p-6 rounded-xl bg-[#0A0A0A] border border-[#FF6B35]/20">
                <div className="space-y-4 opacity-70">
                  {/* Messy text lines */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-3 bg-[#8A8A9A]/40 rounded transform -rotate-1" />
                    <div className="w-32 h-3 bg-[#8A8A9A]/30 rounded transform rotate-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-3 bg-[#8A8A9A]/20 rounded" />
                    <div className="w-24 h-3 bg-[#8A8A9A]/35 rounded transform -rotate-2" />
                    <div className="w-12 h-3 bg-[#8A8A9A]/25 rounded transform rotate-1" />
                  </div>
                  <div className="w-full h-px bg-[#8A8A9A]/20 my-4" />
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-4 bg-[#FF6B35]/20 rounded transform rotate-2" />
                    <div className="w-20 h-4 bg-[#8A8A9A]/30 rounded" />
                    <div className="w-10 h-4 bg-[#8A8A9A]/20 rounded transform -rotate-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-3 bg-[#8A8A9A]/25 rounded" />
                    <div className="w-16 h-3 bg-[#8A8A9A]/15 rounded transform rotate-3" />
                  </div>
                  {/* Coffee stain effect */}
                  <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-[#FF6B35]/5 blur-xl" />
                </div>

                {/* Label */}
                <div className="absolute top-4 right-4 px-2 py-1 rounded bg-[#FF6B35]/10 text-xs text-[#FF6B35]">
                  Suddig handskriven följesedel
                </div>
              </div>

              {/* Labels */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-[#FF6B35]/10 text-sm text-[#FF6B35]">
                  Handskrivet
                </span>
                <span className="px-3 py-1 rounded-full bg-[#FF6B35]/10 text-sm text-[#FF6B35]">
                  Suddigt
                </span>
                <span className="px-3 py-1 rounded-full bg-[#FF6B35]/10 text-sm text-[#FF6B35]">
                  Skadat
                </span>
              </div>
            </div>
          </motion.div>

          {/* After card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="p-6 rounded-2xl bg-[#1A1A2E]/30 backdrop-blur-sm border border-[#00E599]/30 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5 text-[#00E599]" />
                <span className="text-lg font-semibold text-[#00E599]">
                  Efter
                </span>
              </div>

              {/* Clean data table mockup */}
              <div className="rounded-xl bg-[#0A0A0A] border border-[#00E599]/20 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-[#1A1A2E]/50 border-b border-[#00E599]/10">
                  <span className="text-sm font-medium text-[#00E599]">
                    Artikel
                  </span>
                  <span className="text-sm font-medium text-[#00E599]">
                    Vikt
                  </span>
                  <span className="text-sm font-medium text-[#00E599]">
                    Datum
                  </span>
                </div>
                {/* Table rows */}
                <div className="divide-y divide-[#00E599]/5">
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 hover:bg-[#00E599]/5 transition-colors">
                    <span className="text-sm text-[#F5F5F5]">
                      Blandat avfall
                    </span>
                    <span className="text-sm text-[#F5F5F5] font-mono">
                      2,340 kg
                    </span>
                    <span className="text-sm text-[#8A8A9A] font-mono">
                      2025-01-15
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-[#00E599]/[0.02] hover:bg-[#00E599]/5 transition-colors">
                    <span className="text-sm text-[#F5F5F5]">Trä</span>
                    <span className="text-sm text-[#F5F5F5] font-mono">
                      890 kg
                    </span>
                    <span className="text-sm text-[#8A8A9A] font-mono">
                      2025-01-15
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 px-4 py-3 hover:bg-[#00E599]/5 transition-colors">
                    <span className="text-sm text-[#F5F5F5]">Metall</span>
                    <span className="text-sm text-[#F5F5F5] font-mono">
                      1,200 kg
                    </span>
                    <span className="text-sm text-[#8A8A9A] font-mono">
                      2025-01-15
                    </span>
                  </div>
                </div>
              </div>

              {/* Success indicators */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-[#00E599]/10 text-sm text-[#00E599]">
                  Strukturerad
                </span>
                <span className="px-3 py-1 rounded-full bg-[#00E599]/10 text-sm text-[#00E599]">
                  Verifierad
                </span>
                <span className="px-3 py-1 rounded-full bg-[#00E599]/10 text-sm text-[#00E599]">
                  Excel-klar
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link
            href="https://app.vextra.ai"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A2E] text-[#F5F5F5] rounded-xl border border-white/[0.1] hover:border-[#00E599]/30 hover:bg-[#1A1A2E]/80 transition-all"
          >
            Testa med ert eget dokument
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
