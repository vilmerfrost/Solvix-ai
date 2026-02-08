"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Shield, Lock, FileKey, Server, EyeOff, Globe } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
             <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Security Level: Maximum</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              SÄKERHET & COMPLIANCE
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Vi hanterar känslig affärsdata. Därför är säkerhet inte en "feature", det är fundamentet i hela vår arkitektur.
            </p>
          </div>

          {/* Security Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
             <div className="p-8 border border-neutral-200 bg-white">
              <Shield className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">ISO 27001 Hosting</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                All infrastruktur driftas hos ISO 27001 och SOC 2 Type II certifierade leverantörer (Vercel, Supabase, Azure).
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-white">
              <Lock className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Encryption at Rest</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                All data i databas och lagring är krypterad med AES-256. Dina API-nycklar lagras med extra krypteringslager.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-white">
              <FileKey className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Encryption in Transit</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                All trafik tvingas över TLS 1.3 (HTTPS). Vi stödjer HSTS för att förhindra downgrade-attacker.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-white">
              <Server className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">EU Data Residency</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                All data lagras och bearbetas inom EU (Frankfurt/Stockholm regioner) för att garantera GDPR-efterlevnad.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-white">
              <EyeOff className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">Zero Retention (Option)</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                För Enterprise-kunder kan vi konfigurera "Zero Retention" där dokument raderas omedelbart efter processing.
              </p>
            </div>

            <div className="p-8 border border-neutral-200 bg-white">
              <Globe className="w-8 h-8 text-neutral-900 mb-6" />
              <h3 className="font-bold text-xl text-neutral-900 mb-3">DDoS Protection</h3>
              <p className="text-neutral-600 font-mono text-sm leading-relaxed">
                Globalt CDN och Edge-skydd via Vercel Enterprise skyddar mot överbelastningsattacker och intrångsförsök.
              </p>
            </div>

          </div>

          {/* Compliance Badge Section */}
          <div className="mt-24 border-t border-neutral-200 pt-16">
            <h2 className="text-2xl font-bold mb-8 text-neutral-900">COMPLIANCE STANDARDS</h2>
            <div className="flex flex-wrap gap-4">
              {["GDPR COMPLIANT", "SOC 2 TYPE II INFRA", "ISO 27001 INFRA", "CCPA READY", "AES-256 ENCRYPTION"].map((badge, i) => (
                <div key={i} className="border-2 border-neutral-900 px-6 py-3 font-mono font-bold text-sm bg-neutral-50 uppercase">
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
