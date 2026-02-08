"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-neutral-200 py-3"
          : "bg-white border-transparent py-5"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white font-black text-sm tracking-tighter group-hover:bg-neutral-800 transition-colors">
            S
          </div>
          <span className="text-xl font-bold tracking-tighter text-neutral-900">
            SOLVIX.AI
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("hur-det-funkar")}
            className="text-sm font-bold text-neutral-600 hover:text-neutral-900 uppercase tracking-wide transition-colors"
          >
            Teknik
          </button>
          <button
            onClick={() => scrollToSection("prissattning")}
            className="text-sm font-bold text-neutral-600 hover:text-neutral-900 uppercase tracking-wide transition-colors"
          >
            Pris
          </button>
          <button
            onClick={() => scrollToSection("faq")}
            className="text-sm font-bold text-neutral-600 hover:text-neutral-900 uppercase tracking-wide transition-colors"
          >
            FAQ
          </button>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-bold text-neutral-900 hover:text-neutral-600 transition-colors"
          >
            Logga in
          </Link>
          <Link
            href="/signup"
            className="bg-neutral-900 text-white px-5 py-2.5 text-sm font-bold tracking-wide hover:bg-neutral-800 transition-all"
          >
            KOM IGÅNG
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-neutral-900"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-200 p-6 flex flex-col gap-4 md:hidden shadow-xl">
          <button onClick={() => scrollToSection("hur-det-funkar")} className="text-left font-bold text-neutral-900 py-2">
            TEKNIK
          </button>
          <button onClick={() => scrollToSection("prissattning")} className="text-left font-bold text-neutral-900 py-2">
            PRIS
          </button>
          <button onClick={() => scrollToSection("faq")} className="text-left font-bold text-neutral-900 py-2">
            FAQ
          </button>
          <div className="h-px bg-neutral-100 my-2"></div>
          <Link href="/login" className="font-bold text-neutral-900 py-2">
            Logga in
          </Link>
          <Link href="/signup" className="bg-neutral-900 text-white text-center py-3 font-bold tracking-wide">
            KOM IGÅNG
          </Link>
        </div>
      )}
    </nav>
  );
}
