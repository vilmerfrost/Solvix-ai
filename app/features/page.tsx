"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Cpu, Zap, Search, LayoutTemplate, ShieldCheck, Database } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
             <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Pipeline Specs v2.4</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              TEKNISK PIPELINE
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Solvix.ai är inte en "wrapper". Det är en purpose-built extraktionsmotor byggd för logistikdata, med en 4-stegs pipeline för maximal precision.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <Cpu className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Multi-Modal Ingestion</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Stödjer PDF, PNG, TIFF och JPEG. Automatiskt preprocessing (deskew, denoising) innan OCR-steget.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <Zap className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Gemini 1.5 Pro Vision</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Vi använder Googles senaste multimodala modell, finjusterad på svenska logistikdokument för 99.8% precision.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <Search className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Semantisk Validering</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Systemet förstår kontext. "Totalbelopp" måste vara summan av raderna. Datum måste vara giltiga. Moms måste stämma.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <LayoutTemplate className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Dynamisk Tabellanalys</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Oavsett hur tabellen ser ut (sammanslagna celler, saknade linjer) identifierar vår algoritm rader och kolumner korrekt.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Human-in-the-Loop</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Om konfidensen är under 95% flaggas dokumentet för manuell review i vårt effektiva gränssnitt.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-neutral-50 group hover:border-neutral-900 transition-colors">
              <div className="w-12 h-12 bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-sm">
                <Database className="w-6 h-6 text-neutral-900" />
              </div>
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Strukturerad Export</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Data levereras som ren JSON via API, eller som formaterad Excel-fil redo för import i Fortnox/Visma.
              </p>
            </div>

          </div>

          {/* Technical Specs Table */}
          <div className="mt-24 border border-neutral-200">
            <div className="bg-neutral-900 text-white p-4 font-mono text-sm font-bold border-b border-neutral-900">
              SYSTEM_PERFORMANCE_METRICS
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-neutral-200 bg-white">
              <div className="p-6">
                <div className="text-neutral-500 font-mono text-xs mb-1">LATENCY (AVG)</div>
                <div className="text-3xl font-bold text-neutral-900">420ms</div>
              </div>
              <div className="p-6">
                <div className="text-neutral-500 font-mono text-xs mb-1">ACCURACY (VALIDATED)</div>
                <div className="text-3xl font-bold text-neutral-900">99.8%</div>
              </div>
               <div className="p-6">
                <div className="text-neutral-500 font-mono text-xs mb-1">UPTIME (SLA)</div>
                <div className="text-3xl font-bold text-neutral-900">99.99%</div>
              </div>
               <div className="p-6">
                <div className="text-neutral-500 font-mono text-xs mb-1">THROUGHPUT</div>
                <div className="text-3xl font-bold text-neutral-900">∞ / sec</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
