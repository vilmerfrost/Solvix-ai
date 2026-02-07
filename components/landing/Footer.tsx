"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left - Logo & Copyright */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#F5F5F5]">Vextra</span>
            <span className="text-lg font-bold text-[#00E599]">.ai</span>
            <span className="text-sm text-[#8A8A9A] ml-2">
              © 2025 Simplitics AB
            </span>
          </div>

          {/* Center - Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/privacy"
              className="text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              Integritetspolicy
            </Link>
            <Link
              href="/terms"
              className="text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              Villkor
            </Link>
            <Link
              href="mailto:kontakt@vextra.ai"
              className="text-[#8A8A9A] hover:text-[#F5F5F5] transition-colors"
            >
              Kontakt
            </Link>
          </div>

          {/* Right - Email */}
          <a
            href="mailto:kontakt@vextra.ai"
            className="text-sm text-[#8A8A9A] hover:text-[#00E599] transition-colors"
          >
            kontakt@vextra.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
