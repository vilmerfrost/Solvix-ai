"use client";

import { motion } from "framer-motion";
import { Upload, Lock, Zap, CreditCard } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 lg:px-8 pt-20 pb-16 overflow-hidden">
      {/* Background dot grid pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #00E599 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Subtle radial gradient from center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00E599]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1A2E] border border-[#00E599]/20 text-sm text-[#8A8A9A] mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#00E599] animate-pulse" />
          Automatisk dokumentextraktion för logistik
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#F5F5F5] mb-6"
        >
          Förvandla kaotiska
          <br />
          <span className="text-[#00E599]">följesedlar</span> till ren Excel
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-[#8A8A9A] max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Dra in din PDF, bild eller foto. Få tillbaka verifierad, strukturerad
          data på sekunder. Inget konto krävs.
        </motion.p>

        {/* Drag-and-drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="max-w-xl mx-auto mb-10"
        >
          <Link
            href="https://app.vextra.ai"
            className="group block relative"
          >
            <div className="relative p-8 md:p-12 rounded-2xl border-2 border-dashed border-[#8A8A9A]/30 bg-[#1A1A2E]/50 backdrop-blur-sm transition-all duration-300 group-hover:border-[#00E599] group-hover:bg-[#1A1A2E]/80 group-hover:shadow-[0_0_40px_rgba(0,229,153,0.15)]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#00E599]/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <Upload className="w-8 h-8 text-[#00E599]" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-[#F5F5F5] mb-1">
                    Släpp din fil här eller klicka för att ladda upp
                  </p>
                  <p className="text-sm text-[#8A8A9A]">
                    PDF, JPG, PNG — max 25MB
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#8A8A9A]"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00E599]" />
            <span>Krypterad data</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00E599]" />
            <span>30 sek resultat</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#00E599]" />
            <span>Inget kreditkort</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
