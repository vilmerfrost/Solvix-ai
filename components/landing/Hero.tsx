"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Lock, Zap, CreditCard, FileText, Brain, CheckCircle2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

// Simulated verification steps (matches real pipeline)
const VERIFICATION_STEPS = [
  { icon: FileText, label: "Dokument mottaget", detail: "PDF identifierad" },
  { icon: Brain, label: "AI-extraktion", detail: "Gemini + Mistral OCR" },
  { icon: Shield, label: "Verifiering", detail: "Confidence: 97.3%" },
  { icon: CheckCircle2, label: "Redo för granskning", detail: "12 rader extraherade" },
];

export function Hero() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const runDemoAnimation = useCallback(() => {
    setShowDemo(true);
    setCurrentStep(0);

    // Animate through each step
    VERIFICATION_STEPS.forEach((_, i) => {
      setTimeout(() => setCurrentStep(i), (i + 1) * 800);
    });

    // After all steps, redirect to signup
    setTimeout(() => {
      router.push("/signup");
    }, VERIFICATION_STEPS.length * 800 + 1200);
  }, [router]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    runDemoAnimation();
  };

  const handleClick = () => {
    if (!showDemo) runDemoAnimation();
  };

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
          data på sekunder.
        </motion.p>

        {/* Interactive Drag-and-drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="max-w-xl mx-auto mb-10"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={`group relative cursor-pointer p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all duration-300 ${
              isDragging
                ? "border-[#00E599] bg-[#00E599]/10 scale-[1.02] shadow-[0_0_60px_rgba(0,229,153,0.2)]"
                : showDemo
                ? "border-[#00E599]/50 bg-[#1A1A2E]/80"
                : "border-[#8A8A9A]/30 bg-[#1A1A2E]/50 backdrop-blur-sm hover:border-[#00E599] hover:bg-[#1A1A2E]/80 hover:shadow-[0_0_40px_rgba(0,229,153,0.15)]"
            }`}
          >
            <AnimatePresence mode="wait">
              {!showDemo ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-xl bg-[#00E599]/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Upload className="w-8 h-8 text-[#00E599]" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-[#F5F5F5] mb-1">
                      {isDragging ? "Släpp filen här..." : "Släpp din fil här eller klicka för att testa"}
                    </p>
                    <p className="text-sm text-[#8A8A9A]">
                      PDF eller Excel — se AI-verifieringen live
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="demo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {VERIFICATION_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = currentStep >= i;
                    const isCurrent = currentStep === i;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={isActive ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                          isCurrent
                            ? "bg-[#00E599]/10 border border-[#00E599]/30"
                            : isActive
                            ? "bg-white/[0.03]"
                            : "opacity-0"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isActive ? "bg-[#00E599]/20" : "bg-white/5"
                        }`}>
                          <Icon className={`w-5 h-5 ${isActive ? "text-[#00E599]" : "text-[#8A8A9A]"}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${isActive ? "text-[#F5F5F5]" : "text-[#8A8A9A]"}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-[#8A8A9A]">{step.detail}</p>
                        </div>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-[#00E599] flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#0A0A0A]" />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}

                  {currentStep >= VERIFICATION_STEPS.length - 1 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center text-sm text-[#00E599] font-medium pt-2"
                    >
                      Skapa konto för att se resultatet &rarr;
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
