"use client";

import { ArrowRight, Check, FileText, Zap, Shield, Database } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 border-b border-neutral-200">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-12 lg:gap-24 items-center">
        
        {/* Left Column: The Pitch */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 w-fit bg-neutral-900 text-white">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-mono tracking-widest uppercase font-bold">System Online v2.4</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-neutral-900 mb-8 leading-[0.9]">
            KAOTISKA<br/>
            FÖLJESEDLAR<br/>
            <span className="text-neutral-400">→</span> REN EXCEL.
          </h1>
          
          <p className="text-lg text-neutral-600 mb-10 max-w-md font-medium leading-relaxed">
            Eliminera manuell inmatning. Vextra omvandlar ostrukturerade PDF:er och bilder till strukturerad data med 99.8% precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/signup"
              className="bg-neutral-900 text-white px-8 py-4 text-base font-bold tracking-wide hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 group"
            >
              STARTA PROCESSEN
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="px-8 py-4 text-base font-bold tracking-wide border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all flex items-center justify-center text-neutral-900"
            >
              SE DEMO
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-8 border-t border-neutral-200">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-neutral-500 uppercase mb-1">BEARBETNINGSTID</span>
              <span className="text-2xl font-bold font-mono text-neutral-900">0.4s<span className="text-sm text-neutral-400 font-normal ml-1">/ sida</span></span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono text-neutral-500 uppercase mb-1">NOGGRANNHET</span>
              <span className="text-2xl font-bold font-mono text-neutral-900">99.8%<span className="text-sm text-neutral-400 font-normal ml-1">verifierad</span></span>
            </div>
          </div>
        </div>

        {/* Right Column: The Proof (Technical Viz) */}
        <div className="lg:col-span-7 relative">
          <div className="relative border-2 border-neutral-900 bg-neutral-50 p-2 shadow-[10px_10px_0px_0px_rgba(23,23,23,1)]">
            {/* Window Chrome */}
            <div className="flex items-center justify-between border-b-2 border-neutral-200 bg-white px-4 py-2 mb-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-900"></div>
                <div className="w-3 h-3 rounded-full border border-neutral-300"></div>
                <div className="w-3 h-3 rounded-full border border-neutral-300"></div>
              </div>
              <div className="text-xs font-mono text-neutral-400">PIPELINE_PREVIEW_MODE</div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 h-[500px]">
              {/* Input: The Receipt */}
              <div className="bg-white border border-neutral-200 p-4 relative overflow-hidden group">
                <div className="absolute top-2 left-2 z-10 bg-neutral-900 text-white text-[10px] font-mono px-2 py-1">INPUT: RAW_PDF</div>
                <div className="h-full flex items-center justify-center opacity-80 rotate-1 scale-95 transition-transform duration-700 group-hover:scale-100 group-hover:rotate-0">
                  {/* CSS Receipt Illustration */}
                  <div className="w-full max-w-[280px] bg-white border border-neutral-200 shadow-sm p-6 text-xs font-mono text-neutral-400 space-y-4">
                    <div className="w-12 h-12 border-2 border-neutral-200 mb-4 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-neutral-300" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-neutral-100 w-1/2"></div>
                      <div className="h-2 bg-neutral-100 w-3/4"></div>
                    </div>
                    <div className="border-t border-dashed border-neutral-200 my-4"></div>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="bg-neutral-100 text-transparent">Item</span><span className="bg-neutral-100 text-transparent">0.00</span></div>
                      <div className="flex justify-between"><span className="bg-neutral-100 text-transparent">Item</span><span className="bg-neutral-100 text-transparent">0.00</span></div>
                      <div className="flex justify-between"><span className="bg-neutral-100 text-transparent">Item</span><span className="bg-neutral-100 text-transparent">0.00</span></div>
                    </div>
                    <div className="border-t border-neutral-900 my-4 pt-2 flex justify-between font-bold text-neutral-900">
                      <span>TOTAL</span>
                      <span>SEK 2490.00</span>
                    </div>
                  </div>
                </div>
                {/* Scanning line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-[scan_3s_ease-in-out_infinite]"></div>
              </div>

              {/* Output: The Data */}
              <div className="bg-neutral-900 p-4 text-green-400 font-mono text-xs overflow-hidden relative">
                <div className="absolute top-2 left-2 z-10 border border-green-500/30 bg-green-500/10 text-green-400 px-2 py-1">OUTPUT: JSON_STREAM</div>
                <div className="mt-8 space-y-1 opacity-90">
                  <p><span className="text-green-600">{`{`}</span></p>
                  <p className="pl-4"><span className="text-white">"status"</span>: <span className="text-green-300">"success"</span>,</p>
                  <p className="pl-4"><span className="text-white">"confidence"</span>: <span className="text-green-300">0.998</span>,</p>
                  <p className="pl-4"><span className="text-white">"data"</span>: <span className="text-green-600">{`{`}</span></p>
                  <p className="pl-8"><span className="text-white">"vendor"</span>: <span className="text-yellow-300">"Nordfrakt AB"</span>,</p>
                  <p className="pl-8"><span className="text-white">"date"</span>: <span className="text-yellow-300">"2024-02-08"</span>,</p>
                  <p className="pl-8"><span className="text-white">"total"</span>: <span className="text-yellow-300">2490.00</span>,</p>
                  <p className="pl-8"><span className="text-white">"currency"</span>: <span className="text-yellow-300">"SEK"</span>,</p>
                  <p className="pl-8"><span className="text-white">"items"</span>: <span className="text-green-600">{`[`}</span></p>
                  <p className="pl-12"><span className="text-gray-500">/* 12 items extracted */</span></p>
                  <p className="pl-8"><span className="text-green-600">{`]`}</span></p>
                  <p className="pl-4"><span className="text-green-600">{`}`}</span></p>
                  <p><span className="text-green-600">{`}`}</span></p>
                  <div className="mt-4 border-t border-green-900 pt-2 text-green-700">
                    <p>{`> Exporting to Azure Blob Storage...`}</p>
                    <p>{`> Syncing with Fortnox...`}</p>
                    <p className="text-white animate-pulse">{`> Done.`}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
