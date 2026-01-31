// Server-side authentication check
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getAuthUser();
  if (user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-indigo-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-purple-600/6 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-white/90 text-lg tracking-tight">Vextra</span>
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
              <Link 
                href="/login" 
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link 
                href="/signup" 
                className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-white/70 mb-8">
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
              href="/signup" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all text-center"
            >
              Start free trial
            </Link>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-white/[0.05] text-white font-semibold rounded-xl border border-white/[0.1] hover:bg-white/[0.08] transition-all text-center"
            >
              Sign in
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">95%+</span>
              <span className="text-white/40">accuracy</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">10x</span>
              <span className="text-white/40">faster</span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">PDF + Excel</span>
              <span className="text-white/40">supported</span>
            </div>
          </div>
        </div>

        {/* Hero Visual - Clean Terminal/Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent z-10 pointer-events-none" />
          
          <div className="bg-[#111113] rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl shadow-black/50">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0f] border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-3 py-1 rounded-md bg-white/[0.03] text-xs text-white/30 font-mono">
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
                  <div key={i} className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
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
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
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
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                title: "PDF & Excel support",
                description: "Process scanned invoices, digital PDFs, and complex Excel spreadsheets. We handle multi-language documents.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              },
              {
                title: "Enterprise security",
                description: "AES-256 encryption, Row Level Security, and full GDPR compliance. Your data stays yours.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              {
                title: "Smart extraction",
                description: "AI automatically identifies material types, weights, dates, addresses, and receivers from any document format.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: "Batch processing",
                description: "Upload hundreds of documents at once. Our queue system processes them efficiently while you focus on other work.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                )
              },
              {
                title: "Excel export",
                description: "Export structured data to Excel with one click. Perfect for reporting, analysis, and integration with your existing systems.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-4 text-white/60 group-hover:text-white/80 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
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
              <div key={i} className="relative">
                <div className="text-7xl font-bold text-white/[0.03] absolute -top-4 -left-2">{item.step}</div>
                <div className="relative pt-8">
                  <h3 className="text-xl font-semibold text-white/90 mb-3">{item.title}</h3>
                  <p className="text-white/40 leading-relaxed">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform translate-x-1/2">
                    <svg className="w-6 h-6 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
              href="/signup" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all"
            >
              Start free trial
            </Link>
            <Link 
              href="/pricing" 
              className="w-full sm:w-auto px-8 py-4 text-white font-semibold rounded-xl border border-white/[0.1] hover:bg-white/[0.05] transition-all"
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
