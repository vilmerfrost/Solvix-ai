"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Gratis",
    price: "0 kr",
    period: "för alltid",
    description: "Perfekt för att testa Vextra",
    features: [
      "10 dokument/månad",
      "PDF, bild & foto",
      "Excel-export",
      "Grundläggande verifiering",
    ],
    cta: "Kom igång gratis",
    highlighted: false,
    href: "https://app.vextra.ai",
  },
  {
    name: "Pro",
    badge: "Populärast",
    price: "1 490 kr",
    period: "/månad",
    description: "För växande team",
    features: [
      "1 500 dokument/månad",
      "Allt i Gratis",
      "Confidence-tröskel",
      "Priority support",
      "Custom templates",
    ],
    extra: "Överskjutande: 1,50 kr/fil",
    cta: "Starta 7 dagars gratis test",
    highlighted: true,
    href: "https://app.vextra.ai",
  },
  {
    name: "Enterprise",
    price: "Anpassad",
    period: "offert",
    description: "För stora organisationer",
    features: [
      "Obegränsade dokument",
      "Allt i Pro",
      "Dedikerad kontaktperson",
      "API-access",
      "SLA & onboarding",
    ],
    cta: "Kontakta oss",
    highlighted: false,
    href: "mailto:kontakt@vextra.ai",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-[#00E599] uppercase tracking-wider">
            Prissättning
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] mt-3 mb-4">
            Enkel, transparent prissättning
          </h2>
          <p className="text-lg text-[#8A8A9A]">
            Börja gratis. Skala när ni växer.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`relative rounded-2xl p-6 lg:p-8 ${
                plan.highlighted
                  ? "bg-[#1A1A2E]/80 border-2 border-[#00E599]/50 scale-105 shadow-[0_0_40px_rgba(0,229,153,0.15)]"
                  : "bg-[#1A1A2E]/30 border border-white/[0.06]"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-[#00E599] text-[#0A0A0A] text-xs font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#F5F5F5] mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-[#8A8A9A]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#F5F5F5]">
                  {plan.price}
                </span>
                <span className="text-[#8A8A9A] ml-1">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#00E599] flex-shrink-0 mt-0.5" />
                    <span className="text-[#F5F5F5]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Extra info */}
              {plan.extra && (
                <p className="text-sm text-[#8A8A9A] mb-6">{plan.extra}</p>
              )}

              {/* CTA */}
              <Link
                href={plan.href}
                className={`block w-full py-3 px-4 rounded-xl text-center font-medium transition-all ${
                  plan.highlighted
                    ? "bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90"
                    : "bg-transparent text-[#F5F5F5] border border-white/[0.1] hover:border-[#00E599]/30 hover:bg-[#1A1A2E]/50"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
