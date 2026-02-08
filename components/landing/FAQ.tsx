"use client";

import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "HUR SÄKER ÄR MIN DATA?",
    answer:
      "All data krypteras (AES-256) vid vila och transit (TLS 1.3). Vi säljer aldrig data. Hosting sker uteslutande på ISO 27001-certifierade datacenter inom EU.",
  },
  {
    question: "HANTERAR NI HANDSKRIVNA SEDLAR?",
    answer:
      "Ja. Vår vision-pipeline använder Gemini 1.5 Pro som är finjusterad på logistikdokument, vilket ger överlägsen tolkning av handstil jämfört med traditionell OCR.",
  },
  {
    question: "KAN JAG INTEGRERA MED FORTNOX?",
    answer:
      "Enterprise-kunder får tillgång till vårt REST API samt färdiga adaptrar för Fortnox, Visma och SAP. För Pro-kunder sker export via standardiserad Excel/CSV.",
  },
  {
    question: "VAD HÄNDER VID FELTOLKNING?",
    answer:
      "Systemet flaggar automatiskt rader med låg konfidens (<95%). Dessa markeras tydligt i dashboarden för snabb manuell verifiering innan export.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 px-6 bg-white border-b border-neutral-200" id="faq">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4">
          <h2 className="text-4xl font-bold tracking-tighter text-neutral-900 mb-4">
            FAQ
          </h2>
          <p className="text-neutral-500 font-mono text-sm">
            // Vanliga frågor om säkerhet och teknik
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-neutral-200">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-neutral-200">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full py-6 text-left flex items-start justify-between group hover:bg-neutral-50 transition-colors px-2 -mx-2"
                >
                  <span className={`font-bold text-lg tracking-tight ${openIndex === index ? "text-neutral-900" : "text-neutral-600 group-hover:text-neutral-900"}`}>
                    {faq.question}
                  </span>
                  <span className="ml-4 mt-1 text-neutral-400 group-hover:text-neutral-900">
                    {openIndex === index ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </span>
                </button>
                {openIndex === index && (
                  <div className="pb-8 text-neutral-600 leading-relaxed max-w-2xl font-medium px-2">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
