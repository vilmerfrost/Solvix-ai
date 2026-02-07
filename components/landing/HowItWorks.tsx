"use client";

import { motion } from "framer-motion";
import { FileUp, ScanSearch, FileSpreadsheet } from "lucide-react";

const steps = [
  {
    icon: FileUp,
    title: "1. Ladda upp",
    description:
      "Dra in din PDF, foto eller skannad bild — oavsett format eller kvalitet.",
  },
  {
    icon: ScanSearch,
    title: "2. AI verifierar",
    description:
      "Vår 4-stegs AI-pipeline extraherar, dubbelkollar och flaggar osäker data automatiskt.",
  },
  {
    icon: FileSpreadsheet,
    title: "3. Ladda ner",
    description: "Ren, strukturerad Excel — redo att importera i ert system.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A]">
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
            Hur det funkar
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] mt-3">
            Från kaos till struktur i tre steg
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line - desktop only */}
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-[#00E599]/30 to-transparent" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative"
              >
                <div className="group p-8 rounded-2xl bg-[#1A1A2E]/30 backdrop-blur-sm border border-white/[0.06] hover:border-[#00E599]/30 hover:bg-[#1A1A2E]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,229,153,0.1)]">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-[#00E599]/10 flex items-center justify-center mb-6 group-hover:bg-[#00E599]/20 transition-colors">
                    <step.icon className="w-7 h-7 text-[#00E599]" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-[#F5F5F5] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[#8A8A9A] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Step number indicator */}
                <div className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0A0A0A] border border-[#00E599]/50 items-center justify-center">
                  <span className="text-xs text-[#00E599] font-medium">
                    {i + 1}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
