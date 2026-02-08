"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4A90E2] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Vextra.ai
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-10">
            <button
              onClick={() => scrollToSection("hur-det-funkar")}
              className="text-sm font-medium text-slate-600 hover:text-[#4A90E2] transition-colors"
            >
              Hur det funkar
            </button>
            <button
              onClick={() => scrollToSection("prissattning")}
              className="text-sm font-medium text-slate-600 hover:text-[#4A90E2] transition-colors"
            >
              Prissättning
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-sm font-medium text-slate-600 hover:text-[#4A90E2] transition-colors"
            >
              FAQ
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-[#4A90E2]/10 text-[#4A90E2] px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#4A90E2]/20 transition-all"
            >
              Logga in
            </Link>
            <Link
              href="/signup"
              className="bg-[#4A90E2] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-[#4A90E2]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Testa gratis
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
