"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "Funkar det med handskrivna dokument?",
    answer:
      "Ja. Vår AI är tränad för att hantera handskrivna, suddiga och skadade dokument — precis de som era chaufförer producerar i verkligheten.",
  },
  {
    question: "Vad händer om AI:n gissar fel?",
    answer:
      "Varje dokument går genom en 4-stegs verifiering. Osäker data flaggas automatiskt. Ni ställer in er egen confidence-tröskel för vad som kräver manuell granskning.",
  },
  {
    question: "Är min data säker?",
    answer:
      "All data krypteras under överföring och lagring. Dokument raderas automatiskt efter bearbetning om ni vill.",
  },
  {
    question: "Vad händer om ni lägger ner?",
    answer:
      "All er data kan exporteras när som helst i standard-format. Ni äger alltid er data.",
  },
  {
    question: "Måste jag ha en API-nyckel?",
    answer:
      "Nej. Allt ingår i er plan. Inga externa konton eller nycklar krävs.",
  },
  {
    question: "Kan jag integrera med vårt befintliga system?",
    answer:
      "Enterprise-planen inkluderar API-access för direkt integration med ert ERP, WMS eller ekonomisystem.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium text-[#F5F5F5] group-hover:text-[#00E599] transition-colors pr-4">
          {question}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
            isOpen
              ? "bg-[#00E599]/20 text-[#00E599]"
              : "bg-[#1A1A2E] text-[#8A8A9A] group-hover:bg-[#1A1A2E]/80"
          }`}
        >
          {isOpen ? (
            <Minus className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-[#8A8A9A] leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-sm font-medium text-[#00E599] uppercase tracking-wider">
            Vanliga frågor
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] mt-3">
            Allt du behöver veta
          </h2>
        </motion.div>

        {/* FAQ items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl bg-[#1A1A2E]/30 backdrop-blur-sm border border-white/[0.06] px-6"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
