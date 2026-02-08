"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200 py-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-6 h-6 bg-neutral-900 flex items-center justify-center text-white font-black text-xs tracking-tighter">
                V
              </div>
              <span className="text-lg font-bold tracking-tighter text-neutral-900">
                VEXTRA.AI
              </span>
            </Link>
            <p className="text-neutral-500 font-medium text-sm leading-relaxed max-w-sm mb-8">
              Automatisering av logistikdata för företag som värdesätter precision. 
              Byggd i Stockholm.
            </p>
            <div className="flex gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                LinkedIn
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-900 transition-colors">
                Twitter
              </a>
            </div>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <h4 className="font-mono text-xs font-bold text-neutral-400 mb-6 uppercase tracking-wider">Produkt</h4>
            <ul className="space-y-4 text-sm font-bold text-neutral-600">
              <li><Link href="#hur-det-funkar" className="hover:text-neutral-900 transition-colors">Teknik</Link></li>
              <li><Link href="/signup" className="hover:text-neutral-900 transition-colors">Integrationer</Link></li>
              <li><Link href="/signup" className="hover:text-neutral-900 transition-colors">Säkerhet</Link></li>
              <li><Link href="/signup" className="hover:text-neutral-900 transition-colors">API Docs</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-mono text-xs font-bold text-neutral-400 mb-6 uppercase tracking-wider">Företag</h4>
            <ul className="space-y-4 text-sm font-bold text-neutral-600">
              <li><Link href="/about" className="hover:text-neutral-900 transition-colors">Om oss</Link></li>
              <li><Link href="/careers" className="hover:text-neutral-900 transition-colors">Karriär</Link></li>
              <li><Link href="/blog" className="hover:text-neutral-900 transition-colors">Blogg</Link></li>
              <li><Link href="/contact" className="hover:text-neutral-900 transition-colors">Kontakt</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-mono text-xs font-bold text-neutral-400 mb-6 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-4 text-sm font-bold text-neutral-600">
              <li><Link href="/privacy" className="hover:text-neutral-900 transition-colors">Integritet</Link></li>
              <li><Link href="/terms" className="hover:text-neutral-900 transition-colors">Villkor</Link></li>
              <li><Link href="/cookies" className="hover:text-neutral-900 transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-neutral-400">
          <p>© 2024 Vextra.ai AB. Alla rättigheter förbehållna.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            SYSTEM STATUS: ONLINE
          </div>
        </div>
      </div>
    </footer>
  );
}
