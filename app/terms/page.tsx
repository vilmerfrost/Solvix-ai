"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Scale, AlertTriangle, CreditCard, Ban, FileSignature } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
            <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Legal Protocol v2.1</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-neutral-900 mb-6">
              ANVÄNDARVILLKOR
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
                  <FileSignature className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">1. GODKÄNNANDE</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-lg text-neutral-600 leading-relaxed font-medium">
                  Genom att använda Vextra AI ("Tjänsten") ingår du ett juridiskt bindande avtal med Vextra AI AB. Om du inte godkänner dessa villkor får du inte använda tjänsten.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">2. API & KOSTNADER</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <div className="bg-amber-50 border border-amber-200 p-6 mb-6">
                  <h3 className="text-amber-900 font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    BYOK (Bring Your Own Key)
                  </h3>
                  <p className="text-amber-800 text-sm">
                    Vextra AI använder en modell där du tillhandahåller egna API-nycklar. Du är ensamt ansvarig för alla kostnader som uppstår hos dina AI-leverantörer (OpenAI, Anthropic, Google). Vi rekommenderar starkt att du sätter kostnadsgränser (Hard Limits).
                  </p>
                </div>
                <p className="text-neutral-600 font-medium">
                  Du ansvarar för att hålla dina API-nycklar säkra. Vextra AI lagrar dessa nycklar krypterade men ansvarar inte för missbruk om ditt konto komprometteras på grund av svagt lösenord.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Ban className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">3. FÖRBJUDEN ANVÄNDNING</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <ul className="grid gap-4">
                  {[
                    "Olaglig verksamhet eller penningtvätt",
                    "Bearbetning av dokument du inte äger rättigheterna till",
                    "Reverse engineering av vår plattform",
                    "Massautomatisering som liknar DDoS-attacker"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center justify-between p-4 border border-neutral-200 bg-neutral-50 text-neutral-700 font-bold text-sm">
                      {item}
                      <span className="text-red-500 text-xs font-mono uppercase">FÖRBJUDET</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <CreditCard className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">4. BETALNING</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-neutral-600 font-medium mb-4">
                  Betalda prenumerationer debiteras i förskott månadsvis.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <span className="font-mono text-neutral-400 font-bold">01.</span>
                    <span className="text-neutral-800">Du kan avsluta när som helst. Tjänsten fortsätter perioden ut.</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="font-mono text-neutral-400 font-bold">02.</span>
                    <span className="text-neutral-800">Inga återbetalningar för påbörjad månad.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Section 5 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Scale className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">5. ANSVARSBEGRÄNSNING</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <div className="border-l-4 border-neutral-900 pl-6 py-2">
                  <p className="text-neutral-900 font-bold italic text-lg">
                    "Tjänsten tillhandahålls i befintligt skick."
                  </p>
                </div>
                <p className="mt-4 text-neutral-600 font-medium">
                  Vi garanterar inte att AI-tolkningen är 100% felfri. Du ansvarar för att verifiera all data innan den exporteras till ditt affärssystem. Vextra AI ansvarar inte för ekonomisk skada som uppstår till följd av felaktig datatolkning.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
