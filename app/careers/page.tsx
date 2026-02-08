"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight, MapPin, Clock } from "lucide-react";

export default function CareersPage() {
  const jobs = [
    {
      role: "Senior Fullstack Engineer",
      dept: "Engineering",
      loc: "Stockholm / Remote",
      type: "Full-time"
    },
    {
      role: "AI / ML Engineer",
      dept: "R&D",
      loc: "Stockholm",
      type: "Full-time"
    },
    {
      role: "Technical Account Manager",
      dept: "Sales",
      loc: "Remote (EU)",
      type: "Full-time"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20">
             <div className="inline-flex items-center gap-2 border border-neutral-900 px-3 py-1 mb-8 bg-neutral-900 text-white">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-mono tracking-widest uppercase font-bold">We are hiring</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 mb-6">
              JOIN THE MACHINE.
            </h1>
            <p className="text-xl text-neutral-600 font-medium max-w-2xl leading-relaxed">
              Vi bygger infrastrukturen för nästa generations logistik. Vill du jobba med avancerad AI, TypeScript och Rust?
            </p>
          </div>

          {/* Job List */}
          <div className="border-t border-neutral-900">
            {jobs.map((job, i) => (
              <div key={i} className="group border-b border-neutral-200 py-12 flex flex-col md:flex-row md:items-center justify-between hover:bg-neutral-50 transition-colors px-4 -mx-4 cursor-pointer">
                <div>
                  <h3 className="text-3xl font-bold text-neutral-900 mb-2 group-hover:text-blue-600 transition-colors">{job.role}</h3>
                  <div className="flex items-center gap-6 text-sm font-mono text-neutral-500">
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.loc}</span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {job.type}</span>
                    <span className="uppercase font-bold tracking-wider">{job.dept}</span>
                  </div>
                </div>
                <div className="mt-6 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-20px] group-hover:translate-x-0 duration-300">
                  <ArrowRight className="w-8 h-8 text-neutral-900" />
                </div>
              </div>
            ))}
          </div>

          {/* No jobs CTA */}
          <div className="mt-24 bg-neutral-100 p-12 text-center">
            <h3 className="text-2xl font-bold mb-4">Hittar du inte din roll?</h3>
            <p className="text-neutral-600 mb-8 max-w-md mx-auto">
              Vi letar alltid efter talang. Skicka en spontanansökan och berätta vad du kan bygga.
            </p>
            <a href="mailto:careers@solvix.ai" className="inline-block border-2 border-neutral-900 px-8 py-3 font-bold text-neutral-900 hover:bg-neutral-900 hover:text-white transition-all">
              MAILA OSS
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
