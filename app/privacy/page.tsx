"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Shield, Lock, Eye, Server, FileText, Cookie, Mail } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
            <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Privacy Protocol v1.0</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-neutral-900 mb-6">
              INTEGRITETSPOLICY
            </h1>
            <p className="text-xl text-neutral-500 font-mono">
              // Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid gap-12">
            
            {/* Section 1 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Shield className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">1. INTRODUKTION</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-lg text-neutral-600 leading-relaxed font-medium">
                  Vextra AI ("vi", "oss", "vår") värnar om din integritet. Denna integritetspolicy förklarar strikt hur vi samlar in, använder, lagrar och skyddar dina personuppgifter när du använder vår tjänst för dokumentextraktion. Vi tror på full transparens.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Lock className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">2. PERSONUPPGIFTSANSVARIG</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <div className="bg-neutral-50 p-6 border border-neutral-200 font-mono text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-4">
                    <span className="text-neutral-400 font-bold">BOLAG:</span>
                    <span className="text-neutral-900">Vextra AI AB</span>
                    <span className="text-neutral-400 font-bold">ORG.NR:</span>
                    <span className="text-neutral-900">559000-0000</span>
                    <span className="text-neutral-400 font-bold">EMAIL:</span>
                    <span className="text-neutral-900">privacy@vextra.ai</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Eye className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">3. DATAINSAMLING</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-neutral-600 mb-6 font-medium">Vi samlar endast in data som är absolut nödvändig för tjänstens funktion:</p>
                <ul className="space-y-4">
                  {[
                    "Kontouppgifter (E-post, Namn)",
                    "Dokumentdata (Uppladdade filer för extraktion)",
                    "Användningsdata (API-anrop, loggar)",
                    "Tekniska data (IP-adress, enhetsinfo)"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-neutral-800 font-bold border-l-2 border-neutral-200 pl-4">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Server className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">4. LAGRING & SÄKERHET</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-neutral-600 mb-6 font-medium">
                  All data lagras krypterad (AES-256) på servrar inom EU. Vi använder en strikt "Zero Knowledge"-arkitektur där det är möjligt.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border border-neutral-200 p-4">
                    <div className="font-mono text-xs text-neutral-400 mb-1">DATABASE</div>
                    <div className="font-bold text-neutral-900">Supabase (EU-West)</div>
                  </div>
                  <div className="border border-neutral-200 p-4">
                    <div className="font-mono text-xs text-neutral-400 mb-1">STORAGE</div>
                    <div className="font-bold text-neutral-900">Azure Blob (EU-North)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Mail className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">5. KONTAKT</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-neutral-600 font-medium">
                  För utdrag ur registret eller radering av data ("Rätten att bli glömd"), kontakta oss direkt. Vi hanterar alla ärenden inom 24 timmar.
                </p>
                <a href="mailto:privacy@vextra.ai" className="inline-block mt-4 text-lg font-bold text-neutral-900 underline decoration-2 underline-offset-4 hover:bg-neutral-900 hover:text-white transition-all px-1 -mx-1">
                  privacy@vextra.ai
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
