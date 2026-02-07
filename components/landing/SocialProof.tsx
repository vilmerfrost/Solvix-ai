"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref} className="font-mono">
      {count}
      {suffix}
    </span>
  );
}

export function SocialProof() {
  const metrics = [
    { value: 97, suffix: "%", label: "Accuracy på extraherad data" },
    { value: 30, suffix: "s", label: "Genomsnittlig tid per dokument" },
    { value: 4, suffix: "h+", label: "Sparad tid per dag" },
  ];

  return (
    <section className="relative py-24 px-6 lg:px-8 bg-[#0A0A0A]">
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
            Resultat
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#F5F5F5] mt-3">
            Företag sparar timmar varje dag
          </h2>
        </motion.div>

        {/* Metric cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative p-8 rounded-2xl bg-[#1A1A2E]/50 backdrop-blur-sm border border-white/[0.06] hover:border-[#00E599]/30 transition-all duration-300"
            >
              <div className="text-5xl md:text-6xl font-bold text-[#00E599] mb-3">
                <AnimatedNumber value={metric.value} suffix={metric.suffix} />
              </div>
              <p className="text-[#8A8A9A] text-lg">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-3xl mx-auto text-center"
        >
          <blockquote className="text-xl md:text-2xl text-[#F5F5F5] leading-relaxed mb-6">
            &ldquo;Vi hanterar 200+ följesedlar om dagen. Vextra har förändrat
            hur vi jobbar.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center">
              <span className="text-[#00E599] font-semibold">AN</span>
            </div>
            <div className="text-left">
              <p className="text-[#F5F5F5] font-medium">Anders Nilsson</p>
              <p className="text-sm text-[#8A8A9A]">Operations Manager</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
