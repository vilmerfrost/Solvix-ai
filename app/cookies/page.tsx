"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Cookie, Settings, Check, X } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="mb-20 border-b border-neutral-200 pb-12">
            <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">Cookie Protocol v1.0</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-neutral-900 mb-6">
              COOKIE POLICY
            </h1>
            <p className="text-xl text-neutral-500 font-mono">
              // Vi använder kakor för funktion, inte för spioneri.
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid gap-12">
            
            {/* Section 1 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Cookie className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">1. VAD VI ANVÄNDER</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-lg text-neutral-600 leading-relaxed font-medium mb-8">
                  Vextra AI använder enbart nödvändiga cookies för att tjänsten ska fungera säkert. Vi använder inga tredjeparts-cookies för marknadsföring eller spårning.
                </p>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-bold text-neutral-900">Session & Auth</div>
                        <div className="text-xs text-neutral-600">Supabase Auth Tokens</div>
                      </div>
                    </div>
                    <span className="text-green-700 text-xs font-mono font-bold uppercase px-2 py-1 bg-green-100 border border-green-200">NÖDVÄNDIG</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-green-200 bg-green-50">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-bold text-neutral-900">Säkerhet (CSRF)</div>
                        <div className="text-xs text-neutral-600">Skydd mot förfalskade anrop</div>
                      </div>
                    </div>
                    <span className="text-green-700 text-xs font-mono font-bold uppercase px-2 py-1 bg-green-100 border border-green-200">NÖDVÄNDIG</span>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-neutral-200 bg-neutral-50 opacity-50">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                      <div>
                        <div className="font-bold text-neutral-900">Marknadsföring</div>
                        <div className="text-xs text-neutral-600">Facebook Pixel, Google Ads</div>
                      </div>
                    </div>
                    <span className="text-neutral-500 text-xs font-mono font-bold uppercase px-2 py-1 border border-neutral-200">EJ AKTIV</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="grid md:grid-cols-12 gap-8 border-b border-neutral-100 pb-12">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3 text-neutral-900 mb-2">
                  <Settings className="w-5 h-5" />
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wider">2. HANTERA KAKOR</h2>
                </div>
              </div>
              <div className="md:col-span-8">
                <p className="text-neutral-600 font-medium mb-6">
                  Eftersom vi endast använder strikt nödvändiga cookies krävs inget samtycke enligt ePrivacy-direktivet. Du kan dock blockera cookies i din webbläsare, men då kommer du inte kunna logga in.
                </p>
                
                <div className="bg-neutral-900 text-white p-6">
                  <div className="font-mono text-xs text-neutral-500 mb-2">STATUS</div>
                  <div className="flex items-center gap-2 text-green-400 font-bold">
                    <Check className="w-4 h-4" />
                    COOKIES: MINIMAL
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
