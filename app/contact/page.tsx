"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              KONTAKT
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Redo att automatisera? Eller har du bara en fråga? Vi är snabba på att svara.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 lg:gap-32">
            
            {/* Contact Info */}
            <div className="space-y-12">
              <div className="border border-neutral-200 p-8 bg-neutral-50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white border border-neutral-200">
                    <Mail className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900">Email</h3>
                    <p className="text-neutral-500 font-mono text-sm">Svarar inom 24h</p>
                  </div>
                </div>
                <a href="mailto:hello@solvix.ai" className="text-2xl font-bold text-neutral-900 hover:text-blue-600 underline decoration-2 underline-offset-4">
                  hello@solvix.ai
                </a>
              </div>

              <div className="border border-neutral-200 p-8 bg-neutral-50">
                <div className="flex items-center gap-4 mb-4">
                   <div className="p-3 bg-white border border-neutral-200">
                    <MapPin className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900">Kontor</h3>
                    <p className="text-neutral-500 font-mono text-sm">Besök oss</p>
                  </div>
                </div>
                <p className="text-xl font-medium text-neutral-900">
                  Solvix.ai AB<br/>
                  Sveavägen 44<br/>
                  111 34 Stockholm
                </p>
              </div>
            </div>

            {/* Form Placeholder */}
            <div>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-2 uppercase tracking-wide">Namn</label>
                  <input type="text" className="w-full bg-white border border-neutral-300 p-4 font-medium focus:border-neutral-900 focus:outline-none transition-colors" placeholder="Ditt namn" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-2 uppercase tracking-wide">Email</label>
                  <input type="email" className="w-full bg-white border border-neutral-300 p-4 font-medium focus:border-neutral-900 focus:outline-none transition-colors" placeholder="namn@foretag.se" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-900 mb-2 uppercase tracking-wide">Meddelande</label>
                  <textarea rows={6} className="w-full bg-white border border-neutral-300 p-4 font-medium focus:border-neutral-900 focus:outline-none transition-colors" placeholder="Hur kan vi hjälpa dig?" />
                </div>
                <button className="w-full bg-neutral-900 text-white font-bold py-4 hover:bg-neutral-800 transition-colors tracking-wide uppercase">
                  Skicka meddelande
                </button>
              </form>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
