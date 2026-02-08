"use client";

import { Upload, Cpu, CheckSquare, Database, ArrowRight } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      id: "01",
      title: "INGEST",
      icon: <Upload className="w-6 h-6" />,
      desc: "Multi-channel ingestion (Email, API, SFTP). Stödjer PDF, PNG, TIFF, XLSX."
    },
    {
      id: "02",
      title: "VISION",
      icon: <Cpu className="w-6 h-6" />,
      desc: "OCR + Gemini 1.5 Pro pipeline identifierar layout, handstil och tabeller."
    },
    {
      id: "03",
      title: "VALIDATE",
      icon: <CheckSquare className="w-6 h-6" />,
      desc: "Logikmotor verifierar summor, datum och momssatser mot era regler."
    },
    {
      id: "04",
      title: "SYNC",
      icon: <Database className="w-6 h-6" />,
      desc: "Strukturerad JSON/Excel pushas till ERP (Fortnox, Visma, SAP) på <1s."
    }
  ];

  return (
    <section className="py-24 px-6 border-b border-neutral-200 bg-white" id="hur-det-funkar">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-4xl font-bold tracking-tighter text-neutral-900 mb-4">
            PIPELINE ARKITEKTUR
          </h2>
          <p className="text-lg text-neutral-600 font-mono">
            // Full automation från rådata till affärssystem
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-neutral-200 z-0"></div>

          <div className="grid lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative z-10 bg-white group">
                <div className="w-24 h-24 border-2 border-neutral-900 bg-white flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(23,23,23,1)] transition-transform group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(23,23,23,1)]">
                  {step.icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-bold text-neutral-400">Step {step.id}</span>
                  <div className="h-px bg-neutral-200 flex-1"></div>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
