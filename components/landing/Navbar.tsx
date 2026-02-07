"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-1">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#F5F5F5]">
              Vextra
            </span>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-[#00E599]">
              .ai
            </span>
          </Link>

          {/* Center/Right Links */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              Hur det funkar
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              Prissättning
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              FAQ
            </button>
          </div>

          {/* CTA Button */}
          <Link
            href="https://app.vextra.ai"
            className="px-4 py-2 text-sm font-medium bg-[#00E599] text-[#0A0A0A] rounded-lg hover:bg-[#00E599]/90 transition-all"
          >
            Testa gratis
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
