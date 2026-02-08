"use client";

import { Upload, Brain, Download } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-white" id="hur-det-funkar">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black mb-4 text-slate-900">
            Så fungerar det
          </h2>
          <p className="text-slate-500">
            Tre enkla steg för att automatisera din dokumenthantering
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-[#4A90E2]/10 rounded-2xl flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-[#4A90E2]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">
              1. Ladda upp
            </h3>
            <p className="text-slate-500 text-center leading-relaxed">
              Ladda upp följesedlar som PDF eller bild. Vi stödjer alla vanliga
              format från stora leverantörer.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-[#4A90E2]/10 rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-10 h-10 text-[#4A90E2]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">
              2. AI extraherar
            </h3>
            <p className="text-slate-500 text-center leading-relaxed">
              Vår specialtränade AI läser av data som vikter, material, datum och
              avsändare med 97% noggrannhet.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-[#4A90E2]/10 rounded-2xl flex items-center justify-center mb-6">
              <Download className="w-10 h-10 text-[#4A90E2]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">
              3. Exportera
            </h3>
            <p className="text-slate-500 text-center leading-relaxed">
              Granska resultatet och exportera direkt till Excel, CSV eller via
              API till ert affärssystem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
