"use client";

import { CheckCircle } from "lucide-react";
import Image from "next/image";

export function BeforeAfter() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-4xl font-black mb-6 leading-tight text-slate-900">
              Gör slut med manuell inmatning
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Att mata in data från hundratals följesedlar är inte bara tråkigt
              – det är en risk för mänskliga fel som kan kosta dyrt i slutändan.
              Vextra automatiserar det tråkiga så att du kan fokusera på det
              viktiga.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">
                    Ingen mer handstilskramp
                  </p>
                  <p className="text-sm text-slate-500">
                    Låt AI:n tyda kladdig handstil och suddiga kopior.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Direkt integration</p>
                  <p className="text-sm text-slate-500">
                    Koppla Vextra direkt till ert ERP eller Excel.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Skalbar lösning</p>
                  <p className="text-sm text-slate-500">
                    Hantera 10 eller 10,000 dokument per månad.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Right Mock Image */}
          <div className="relative bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
            <div className="absolute -top-4 -left-4 bg-[#4A90E2] text-white px-4 py-1 rounded-lg text-sm font-bold">
              Efter Vextra
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gradient-to-br from-[#4A90E2]/20 to-[#4A90E2]/5 rounded-lg flex items-center justify-center">
                <p className="text-slate-400 text-sm">Dashboard Preview</p>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                <div className="h-4 bg-slate-100 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
