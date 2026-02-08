"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-[#4A90E2] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Vextra.ai
              </span>
            </div>
            <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
              Intelligent dokumentextrahering för den moderna logistikbranschen.
              Baserat i Stockholm, levererat till hela världen.
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-[#4A90E2] hover:text-white transition-colors text-slate-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold mb-6 text-slate-900">Produkten</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li>
                <a href="#hur-det-funkar" className="hover:text-[#4A90E2]">
                  Funktioner
                </a>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#4A90E2]">
                  Integrationer
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#4A90E2]">
                  Säkerhet
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#4A90E2]">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Links */}
          <div>
            <h4 className="font-bold mb-6 text-slate-900">Kontakt</h4>
            <ul className="space-y-4 text-sm text-slate-500">
              <li>
                <a href="mailto:kontakt@vextra.ai" className="hover:text-[#4A90E2]">
                  Support
                </a>
              </li>
              <li>
                <a href="mailto:sales@vextra.ai" className="hover:text-[#4A90E2]">
                  Försäljning
                </a>
              </li>
              <li>hello@vextra.ai</li>
              <li>Stockholm, Sverige</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © 2024 Vextra.ai AB. Alla rättigheter reserverade.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-[#4A90E2]">
              Integritetspolicy
            </Link>
            <Link href="/terms" className="hover:text-[#4A90E2]">
              Användarvillkor
            </Link>
            <Link href="/cookies" className="hover:text-[#4A90E2]">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
