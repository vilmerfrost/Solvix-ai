"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export function Pricing() {
  return (
    <section className="py-24 px-6 bg-white" id="prissattning">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black mb-4 text-slate-900">
            Prissättning
          </h2>
          <p className="text-slate-500">Välj en plan som passar er verksamhet</p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 flex flex-col">
            <h3 className="text-xl font-bold mb-2 text-slate-900">Gratis</h3>
            <p className="text-slate-500 text-sm mb-6">För dig som vill testa</p>
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900">0 kr</span>
              <span className="text-slate-500">/mån</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">10 dokument / mån</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Standard AI-motor</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Excel-export</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full py-3 rounded-lg border border-[#4A90E2] text-[#4A90E2] font-bold text-center hover:bg-[#4A90E2]/5 transition-colors"
            >
              Starta gratis
            </Link>
          </div>

          {/* Pro Plan (Featured) */}
          <div className="p-8 bg-[#F0F7FF] rounded-2xl border-2 border-[#4A90E2] flex flex-col relative scale-105 shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#4A90E2] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Populärast
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-900">Pro</h3>
            <p className="text-slate-500 text-sm mb-6">För växande bolag</p>
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900">1 499 kr</span>
              <span className="text-slate-500">/mån</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">500 dokument / mån</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Prioriterad extrahering</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">E-postsupport</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Custom Excel-mallar</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full py-3 rounded-lg bg-[#4A90E2] text-white font-bold text-center hover:shadow-lg transition-all"
            >
              Välj Pro
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 flex flex-col">
            <h3 className="text-xl font-bold mb-2 text-slate-900">Enterprise</h3>
            <p className="text-slate-500 text-sm mb-6">För stora flöden</p>
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900">Offert</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Obegränsat antal dokument</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">API-integration</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">Dedikerad Account Manager</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-5 h-5 text-[#4A90E2]" />
                <span className="text-slate-600">On-premise alternativ</span>
              </li>
            </ul>
            <Link
              href="mailto:sales@vextra.ai"
              className="w-full py-3 rounded-lg border border-slate-900 text-slate-900 font-bold text-center hover:bg-slate-900/5 transition-colors"
            >
              Kontakta oss
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
