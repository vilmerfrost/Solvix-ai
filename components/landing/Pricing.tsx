"use client";

import Link from "next/link";
import { Check } from "lucide-react";

export function Pricing() {
  const plans = [
    {
      name: "FREE",
      price: "0 SEK",
      period: "/ månad",
      desc: "För utvärdering & små volymer.",
      features: [
        "10 dokument / mån",
        "Standard AI-motor (Gemini Flash)",
        "Excel-export",
        "Email support",
      ],
      cta: "Starta gratis",
      href: "/signup",
      highlight: false
    },
    {
      name: "PRO",
      price: "1 499 SEK",
      period: "/ månad",
      desc: "För växande logistikbolag.",
      features: [
        "500 dokument / mån",
        "Prioriterad Kö (Tier 1)",
        "Avancerad Validering (Claude 3.5)",
        "Anpassade Excel-mallar",
      ],
      cta: "Välj Pro",
      href: "/signup",
      highlight: true
    },
    {
      name: "ENTERPRISE",
      price: "OFFERT",
      period: "",
      desc: "För stora flöden & integration.",
      features: [
        "Obegränsad volym",
        "API & Webhook Access",
        "Dedikerad Instans",
        "SLA & Account Manager",
      ],
      cta: "Kontakta oss",
      href: "mailto:sales@solvix.ai",
      highlight: false
    }
  ];

  return (
    <section className="py-24 px-6 bg-white border-b border-neutral-200" id="prissattning">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-2 border-neutral-900 pb-8">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter text-neutral-900 mb-2">
              LICENSMODELLER
            </h2>
            <p className="text-neutral-500 font-mono text-sm">
              Transparent prissättning utan dolda avgifter.
            </p>
          </div>
          <div className="hidden md:block font-mono text-xs text-neutral-400">
            PRICING_TABLE_V2.1
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`flex flex-col border-2 ${
                plan.highlight 
                  ? "border-neutral-900 bg-neutral-50 shadow-[8px_8px_0px_0px_rgba(23,23,23,1)] scale-[1.02] z-10" 
                  : "border-neutral-200 bg-white hover:border-neutral-400 transition-colors"
              }`}
            >
              <div className="p-8 border-b border-inherit">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-mono font-bold text-lg tracking-widest">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
                      Rekommenderad
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-black text-neutral-900 tracking-tight">{plan.price}</span>
                  <span className="text-neutral-500 font-mono text-sm ml-2">{plan.period}</span>
                </div>
                <p className="text-sm text-neutral-600 font-medium">
                  {plan.desc}
                </p>
              </div>

              <div className="p-8 flex-1">
                <ul className="space-y-4">
                  {plan.features.map((feature, f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-700">
                      <Check className="w-4 h-4 text-neutral-900 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0 mt-auto">
                <Link
                  href={plan.href}
                  className={`block w-full py-4 text-center font-bold tracking-wide transition-all ${
                    plan.highlight
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "bg-white border-2 border-neutral-200 text-neutral-900 hover:border-neutral-900"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
