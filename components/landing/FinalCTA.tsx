"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A] overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#00E599]/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-[#F5F5F5] mb-6"
        >
          Sluta mata in data manuellt
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-xl text-[#8A8A9A] mb-10 max-w-2xl mx-auto"
        >
          Testa Vextra gratis. Ingen registrering. Inget kreditkort. Resultat på
          30 sekunder.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <Link
            href="https://app.vextra.ai"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#00E599] text-[#0A0A0A] font-semibold rounded-xl hover:bg-[#00E599]/90 transition-all shadow-[0_0_40px_rgba(0,229,153,0.3)] hover:shadow-[0_0_60px_rgba(0,229,153,0.4)]"
          >
            Ladda upp din första fil
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="mailto:kontakt@vextra.ai"
            className="text-sm text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
          >
            Eller boka en demo med oss
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
