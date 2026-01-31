"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, Check, X, ArrowRight, FileText, Zap, Shield, Database, Upload, FileSpreadsheet } from "lucide-react";

interface LandingPageProps {
  user: any;
}

export function LandingPage({ user }: LandingPageProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased selection:bg-indigo-500/30">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0b]/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-white/90 text-lg tracking-tight">Vextra AI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                How it works
              </Link>
              <Link href="/pricing" className="text-sm text-white/60 hover:text-white/90 transition-colors">
                Pricing
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all shadow-lg shadow-white/10 hover:shadow-white/20 flex items-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2"
                  >
                    Sign in
                  </Link>
                  <Link 
                    href="/signup" 
                    className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all shadow-lg shadow-white/10 hover:shadow-white/20"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 lg:px-8 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-white/70 mb-8 hover:bg-white/[0.08] transition-colors cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Trusted by waste management companies
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">Document extraction</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              powered by AI
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload invoices and weigh slips. Vextra extracts material, weight, dates, and receivers with 95%+ accuracy. Export clean data to Excel in seconds.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              href={user ? "/dashboard" : "/signup"}
              className="group w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all text-center shadow-lg shadow-white/10 hover:shadow-white/20 flex items-center justify-center gap-2"
            >
              {user ? "Go to Dashboard" : "Start free trial"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {!user && (
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 bg-white/[0.05] text-white font-semibold rounded-xl border border-white/[0.1] hover:bg-white/[0.08] transition-all text-center hover:border-white/20"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm">
            <div className="flex items-center gap-2 group cursor-default">
              <span className="text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors">95%+</span>
              <span className="text-white/40 group-hover:text-white/60 transition-colors">accuracy</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2 group cursor-default">
              <span className="text-3xl font-bold text-white group-hover:text-indigo-400 transition-colors">10x</span>
              <span className="text-white/40 group-hover:text-white/60 transition-colors">faster</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2 group cursor-default">
              <span className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">PDF + Excel</span>
              <span className="text-white/40 group-hover:text-white/60 transition-colors">supported</span>
            </div>
          </div>
        </div>

        {/* Hero Visual - Clean Terminal/Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent z-10 pointer-events-none" />
          
          <div className="bg-[#111113] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl shadow-black/50 transform transition-transform hover:scale-[1.01] duration-500">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0f] border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md bg-white/[0.03] text-xs text-white/30 font-mono flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  vextra.ai/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="p-6 space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Processed", value: "1,247", change: "+12%" },
                  { label: "Pending", value: "23", change: "" },
                  { label: "Total Weight", value: "45.2t", change: "+8%" },
                  { label: "Accuracy", value: "97.3%", change: "+2%" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                    <div className="text-xs text-white/40 mb-1">{stat.label}</div>
                    <div className="text-xl font-semibold text-white/90">{stat.value}</div>
                    {stat.change && (
                      <div className="text-xs text-emerald-400 mt-1">{stat.change}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Documents */}
              <div className="bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div className="px-4 py-3 border-b border-white/[0.04]">
                  <span className="text-sm font-medium text-white/70">Recent documents</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    { name: "vagsedel_2026-01-28.pdf", status: "Approved", weight: "2,450 kg", time: "2m ago" },
                    { name: "ragnsells_invoice.pdf", status: "Processing", weight: "—", time: "Just now" },
                    { name: "monthly_report.xlsx", status: "Review", weight: "12,300 kg", time: "5m ago" },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center">
                          <FileText className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <div className="text-sm text-white/80">{doc.name}</div>
                          <div className="text-xs text-white/30">{doc.time}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-white/50">{doc.weight}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          doc.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                          doc.status === "Processing" ? "bg-indigo-500/10 text-indigo-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (Old Way vs Vextra AI) */}
      <section className="relative py-24 px-6 lg:px-8 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Stop manual data entry
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              See the difference automation makes for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Old Way */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-8 relative overflow-hidden group hover:border-red-500/30 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <X className="w-24 h-24 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                <X className="w-5 h-5" />
                The Old Way
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500/50 flex-shrink-0 mt-0.5" />
                  <span className="text-white/60">Manual typing from PDFs</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500/50 flex-shrink-0 mt-0.5" />
                  <span className="text-white/60">Slow processing & delays</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500/50 flex-shrink-0 mt-0.5" />
                  <span className="text-white/60">Human errors & typos</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500/50 flex-shrink-0 mt-0.5" />
                  <span className="text-white/60">Scattered files & folders</span>
                </li>
              </ul>
            </div>

            {/* Vextra Way */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-8 relative overflow-hidden group hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/20">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Check className="w-24 h-24 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                <Check className="w-5 h-5" />
                Vextra AI
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">Automated AI extraction</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">Instant results in seconds</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">95%+ verified accuracy</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-white/90 font-medium">Centralized digital archive</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6 lg:px-8 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need for waste data management
            </h2>
            <p className="text-lg text-white/50">
              From document upload to structured Excel export, Vextra handles the entire workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Multi-model AI",
                description: "Choose between Gemini, GPT, or Claude. Bring your own API key for full control and cost transparency.",
                icon: <Zap className="w-6 h-6" />
              },
              {
                title: "PDF & Excel support",
                description: "Process scanned invoices, digital PDFs, and complex Excel spreadsheets. We handle multi-language documents.",
                icon: <FileSpreadsheet className="w-6 h-6" />
              },
              {
                title: "Enterprise security",
                description: "AES-256 encryption, Row Level Security, and full GDPR compliance. Your data stays yours.",
                icon: <Shield className="w-6 h-6" />
              },
              {
                title: "Smart extraction",
                description: "AI automatically identifies material types, weights, dates, addresses, and receivers from any document format.",
                icon: <FileText className="w-6 h-6" />
              },
              {
                title: "Batch processing",
                description: "Upload hundreds of documents at once. Our queue system processes them efficiently while you focus on other work.",
                icon: <Database className="w-6 h-6" />
              },
              {
                title: "Excel export",
                description: "Export structured data to Excel with one click. Perfect for reporting, analysis, and integration with your existing systems.",
                icon: <Upload className="w-6 h-6" />
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 text-white/60 group-hover:text-white group-hover:bg-indigo-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative py-32 px-6 lg:px-8 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Three steps to structured data
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              From chaotic documents to clean, exportable data in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                title: "Upload",
                description: "Drag and drop your PDFs or Excel files. We support batch uploads of hundreds of documents."
              },
              {
                step: "02",
                title: "AI extracts",
                description: "Our AI identifies and extracts material, weight, date, address, and receiver automatically."
              },
              {
                step: "03",
                title: "Review & export",
                description: "Verify the extracted data, make any adjustments, and export to Excel with one click."
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-7xl font-bold text-white/[0.03] absolute -top-4 -left-2 transition-colors group-hover:text-white/[0.05]">{item.step}</div>
                <div className="relative pt-8 pl-4">
                  <h3 className="text-xl font-semibold text-white/90 mb-3 group-hover:text-white transition-colors">{item.title}</h3>
                  <p className="text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform translate-x-1/2">
                    <ArrowRight className="w-6 h-6 text-white/10" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6 lg:px-8 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to automate your data extraction?
          </h2>
          <p className="text-lg text-white/50 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/10 hover:shadow-white/20"
            >
              {user ? "Go to Dashboard" : "Start free trial"}
            </Link>
            <Link 
              href="/pricing" 
              className="w-full sm:w-auto px-8 py-4 text-white font-semibold rounded-xl border border-white/[0.1] hover:bg-white/[0.05] transition-all hover:border-white/20"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <span className="text-sm text-white/40">© 2026 Vextra AI</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
              <a href="mailto:support@vextra.ai" className="hover:text-white/60 transition-colors">Contact</a>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all transform duration-300 z-50 ${
          showScrollTop ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
