"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight, Check } from "lucide-react";

export default function IntegrationsPage() {
  const systems = [
    {
      name: "FORTNOX",
      type: "ERP / Bokföring",
      status: "Native Adapter",
      desc: "Direkt export av verifikat och leverantörsfakturor via API. Stödjer kostnadsställen och projektkoder.",
      active: true
    },
    {
      name: "VISMA SPCS",
      type: "ERP / Administration",
      status: "Via Excel/CSV",
      desc: "Standardiserad importfil som matchar Visma Administration och eEkonomi formatkrav.",
      active: true
    },
    {
      name: "SAP S/4HANA",
      type: "Enterprise ERP",
      status: "Custom Integration",
      desc: "Skräddarsydd integration via IDoc eller REST API för enterprise-kunder med stora volymer.",
      active: true
    },
    {
      name: "MICROSOFT DYNAMICS",
      type: "Enterprise ERP",
      status: "Custom Integration",
      desc: "Integration via OData endpoints för Dynamics 365 Business Central och Finance.",
      active: true
    },
     {
      name: "EXCEL / CSV",
      type: "Universal",
      status: "Standard",
      desc: "Universellt format. Välj kolumner, ordning och formatmallar för att matcha vilket legacy-system som helst.",
      active: true
    },
    {
      name: "AZURE BLOB",
      type: "Storage",
      status: "Native Sync",
      desc: "Automatisk arkivering av både original-PDF och extraherad JSON till er egen Azure-container.",
      active: true
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
            <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Connections Active</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              INTEGRATIONER
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Solvix.ai är byggt för att passa in i ert existerande ekosystem. Vi agerar mellanlager mellan kaotisk indata och ert strukturerade affärssystem.
            </p>
          </div>

          {/* Integration Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((sys, i) => (
              <div key={i} className="border border-neutral-200 p-8 hover:border-neutral-900 hover:shadow-lg transition-all group bg-white">
                <div className="flex justify-between items-start mb-6">
                  <div className="font-mono text-xs font-bold text-neutral-500 uppercase tracking-wider">{sys.type}</div>
                  {sys.active ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase border border-green-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      {sys.status}
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase border border-neutral-200">
                      KOMMER SNART
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-black text-neutral-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">
                  {sys.name}
                </h3>
                
                <p className="text-neutral-600 font-medium text-sm leading-relaxed mb-6">
                  {sys.desc}
                </p>

                <div className="pt-6 border-t border-neutral-100 flex items-center text-sm font-bold text-neutral-900">
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                  Verifierad koppling
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-24 bg-neutral-900 text-white p-12 text-center">
            <h2 className="text-3xl font-bold mb-6 tracking-tight">Saknar ni ert system?</h2>
            <p className="text-neutral-400 mb-8 max-w-xl mx-auto font-mono text-sm">
              Vi bygger custom-adaptrar för Enterprise-kunder. Kontakta vårt team för en teknisk genomgång av era krav.
            </p>
            <a href="mailto:integrations@solvix.ai" className="inline-flex items-center gap-2 bg-white text-neutral-900 px-8 py-4 font-bold tracking-wide hover:bg-neutral-200 transition-colors">
              KONTAKTA INTEGRATION TEAM
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
