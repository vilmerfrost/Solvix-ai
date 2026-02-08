"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Hur säker är min data?",
    answer:
      "All data krypteras både under överföring och lagring. Vi följer strikta GDPR-riktlinjer och säljer aldrig vidare din data. All bearbetning sker på säkra servrar inom EU.",
  },
  {
    question: "Fungerar det med handskrivna dokument?",
    answer:
      "Ja, vår avancerade AI-modell är tränad på tusentals handskrivna logistikdokument och kan med hög precision tyda de flesta handstilar.",
  },
  {
    question: "Kan jag integrera Vextra i mitt befintliga system?",
    answer:
      "Absolut! För våra Enterprise-kunder erbjuder vi ett robust API som gör det möjligt att automatisera hela flödet från inskanning till bokföring.",
  },
  {
    question: "Vilka filformat stöds?",
    answer:
      "Vi stödjer PDF, JPG, PNG, TIFF och de flesta vanliga bildformat. Vi kan också hantera Excel-filer och skannade dokument.",
  },
  {
    question: "Hur lång tid tar det att komma igång?",
    answer:
      "Du kan börja extrahera data inom några minuter efter registrering. Ingen installation eller setup krävs.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 bg-[#F0F7FF]" id="faq">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black mb-12 text-center text-slate-900">
          Vanliga frågor
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
