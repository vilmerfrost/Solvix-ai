"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="mb-20">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-neutral-900 mb-12 leading-[0.9]">
              VI HATAR<br/>MANUELL<br/>DATAINMATNING.
            </h1>
            <div className="w-24 h-2 bg-neutral-900 mb-12"></div>
            <p className="text-2xl text-neutral-700 font-medium leading-relaxed max-w-3xl">
              Vi är ett team av ingenjörer och datavetare baserade i Stockholm. Vi byggde Vextra eftersom vi tröttnade på att se briljanta logistikkoordinatorer agera mänskliga tangentbord.
            </p>
          </div>

          {/* Mission */}
          <div className="grid md:grid-cols-2 gap-16 border-t border-neutral-200 pt-20 mb-20">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider mb-4 text-neutral-500">VÅR MISSION</h2>
              <h3 className="text-3xl font-bold text-neutral-900 mb-6">Strukturera världens logistikdata.</h3>
              <p className="text-neutral-600 text-lg leading-relaxed">
                Varje dag skickas miljontals följesedlar och fakturor som ostrukturerade PDF:er. Det skapar friktion, fel och onödigt arbete. Vårt mål är att eliminera denna friktion helt med hjälp av AI.
              </p>
            </div>
            <div className="bg-neutral-50 p-8 border border-neutral-200">
              <div className="font-mono text-sm space-y-4 text-neutral-600">
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span>GRUNDAT</span>
                  <span className="font-bold text-neutral-900">2024</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span>HK</span>
                  <span className="font-bold text-neutral-900">STOCKHOLM, SE</span>
                </div>
                 <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span>STATUS</span>
                  <span className="font-bold text-green-600">BOOTSTRAPPED & PROFITABLE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-t-4 border-neutral-900 pt-6">
              <h3 className="font-bold text-xl mb-3">Pragmatism {`>`} Hype</h3>
              <p className="text-neutral-600">Vi använder AI för att lösa tråkiga, verkliga problem. Ingen "magic", bara solid teknik.</p>
            </div>
            <div className="border-t-4 border-neutral-900 pt-6">
              <h3 className="font-bold text-xl mb-3">Speed matters</h3>
              <p className="text-neutral-600">Vårt system ska vara snabbare än du hinner blinka. Latency är en bugg.</p>
            </div>
            <div className="border-t-4 border-neutral-900 pt-6">
              <h3 className="font-bold text-xl mb-3">Data privacy first</h3>
              <p className="text-neutral-600">Din data är din. Vi tränar inga modeller på din data utan explicit tillstånd.</p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
