"use client";

export function BeforeAfter() {
  return (
    <section className="bg-neutral-900 text-white py-24 px-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-0 border border-neutral-700">
          
          {/* BEFORE: Chaos */}
          <div className="p-12 relative overflow-hidden bg-neutral-800 border-b lg:border-b-0 lg:border-r border-neutral-700 group">
            <div className="absolute inset-0 opacity-10">
              {/* Abstract chaotic background */}
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L100 100 M100 0 L0 100 M50 0 L50 100 M0 50 L100 50" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            
            <div className="relative z-10">
              <div className="inline-block bg-red-500/20 text-red-500 border border-red-500/50 px-3 py-1 text-xs font-mono mb-8 font-bold">
                BEFORE: OSTRUKTURERAD KAOS
              </div>
              
              <div className="space-y-6 opacity-60 font-mono text-sm">
                <p className="rotate-1 bg-neutral-900/50 p-2 w-fit">Inkommande_Faktura_001.pdf</p>
                <p className="-rotate-2 bg-neutral-900/50 p-2 w-fit ml-12">IMG_20240208.jpg</p>
                <p className="rotate-3 bg-neutral-900/50 p-2 w-fit">Följesedel_SCAN_ERROR.tiff</p>
              </div>

              <div className="mt-12">
                <h3 className="text-3xl font-bold mb-4 text-neutral-400">Manuellt arbete</h3>
                <ul className="space-y-3 text-neutral-500 font-mono text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span> Handstils-tolkning (felbenäget)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span> Manuell inmatning (4h/vecka)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span> Ingen validering
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* AFTER: Structure */}
          <div className="p-12 bg-neutral-900 relative group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            
            <div className="relative z-10">
              <div className="inline-block bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 text-xs font-mono mb-8 font-bold">
                AFTER: STRUKTURERAD DATA
              </div>

              {/* The "Excel" Grid */}
              <div className="bg-neutral-950 border border-neutral-700 rounded-sm overflow-hidden font-mono text-xs">
                <div className="grid grid-cols-4 bg-neutral-800 text-neutral-400 p-2 border-b border-neutral-700 font-bold">
                  <div>DATUM</div>
                  <div>MATERIAL</div>
                  <div>VIKT (KG)</div>
                  <div>KOSTNAD</div>
                </div>
                {[
                  ["2024-02-08", "Skrot (Järn)", "1,240", "4,200 SEK"],
                  ["2024-02-08", "Koppar B", "450", "32,000 SEK"],
                  ["2024-02-09", "Blandskrot", "890", "1,800 SEK"],
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-4 p-2 border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors text-neutral-300">
                    {row.map((cell, j) => (
                      <div key={j}>{cell}</div>
                    ))}
                  </div>
                ))}
                <div className="p-2 bg-green-900/10 text-green-400 border-t border-green-900/30 flex justify-between items-center">
                  <span>STATUS: SYNCED_TO_ERP</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </div>
              </div>

              <div className="mt-12">
                <h3 className="text-3xl font-bold mb-4 text-white">Full Automation</h3>
                <ul className="space-y-3 text-neutral-400 font-mono text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> 99.8% AI Precision
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> 0 minuter inmatning
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> Realtids-validering
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
