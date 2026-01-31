// VIKTIGT: Tvinga sidan att alltid hämta färsk data
export const dynamic = "force-dynamic";

import { StatsCards } from "@/components/stats-cards";
import { DashboardCharts } from "@/components/dashboard-charts";
import { ExportActions } from "@/components/export-actions";
import { SearchBar } from "@/components/search-bar";
import { createServiceRoleClient } from "@/lib/supabase";
import { UploadZone } from "@/components/upload-zone";
import { 
  FileText, 
  ArrowRight, 
  LogIn, 
  Sparkles, 
  Shield, 
  Zap, 
  CheckCircle,
  BarChart3,
  Upload,
  FileCheck,
  Settings,
  ChevronRight,
  Brain,
  Lock,
  Clock,
  Cpu
} from "lucide-react";
import Link from "next/link";
import { FileActions } from "@/components/file-actions";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge } from "@/components/ui";

// HJÄLPFUNKTION: Hanterar både gamla (strängar) och nya (objekt) format
const getValue = (field: any) => {
  if (!field) return null;
  if (typeof field === "object" && "value" in field) return field.value;
  return field;
};

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Check if user is authenticated
  const user = await getAuthUser();

  // If logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Show landing page for unauthenticated users
  return <LandingPage />;
}

// Premium landing page for unauthenticated users
function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--color-accent)]/20">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-bold text-[var(--color-text-primary)] text-lg">Vextra AI</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors hidden sm:block"
            >
              Priser
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Logga in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-[var(--color-accent)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-accent-hover)] transition-all shadow-sm hover:shadow-md"
            >
              Kom igång
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 text-sm font-medium text-[var(--color-accent-text)] mb-6">
              <Sparkles className="w-4 h-4" />
              AI-driven dokumentextraktion
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-6 leading-[1.1] tracking-tight">
              Automatisera din{" "}
              <span className="text-[var(--color-accent)]">avfallsdatahantering</span>
            </h1>

            <p className="text-lg text-[var(--color-text-secondary)] mb-8 leading-relaxed">
              Ladda upp vågsedlar och fakturor. Vextra AI extraherar automatiskt material, vikt, datum och mottagare med 95%+ noggrannhet.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/signup"
                className="px-6 py-3.5 bg-[var(--color-accent)] text-white font-semibold rounded-xl hover:bg-[var(--color-accent-hover)] transition-all shadow-lg shadow-[var(--color-accent)]/25 flex items-center justify-center gap-2 group"
              >
                Starta gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-semibold rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-tertiary)] transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Logga in
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-6 border-t border-[var(--color-border)]">
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">95%+</p>
                <p className="text-sm text-[var(--color-text-muted)]">Noggrannhet</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">10x</p>
                <p className="text-sm text-[var(--color-text-muted)]">Snabbare</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">PDF + Excel</p>
                <p className="text-sm text-[var(--color-text-muted)]">Filformat</p>
              </div>
            </div>
          </div>

          {/* Right: Visual Demo */}
          <div className="relative">
            <div className="bg-[var(--color-bg-elevated)] rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-xl)] overflow-hidden">
              {/* Demo Header */}
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-error)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--color-warning)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--color-success)]" />
                </div>
                <span className="text-xs text-[var(--color-text-muted)] ml-2">Vextra Dashboard</span>
              </div>

              {/* Demo Content */}
              <div className="p-6 space-y-4">
                {/* Upload indicator */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-muted)] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">vagsedel_2026-01.pdf</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Uppladdad just nu</p>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* Processing */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-info-bg)] border border-[var(--color-info-border)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-info)]/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[var(--color-info)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-info-text)]">AI-extraktion pågår...</p>
                    <p className="text-xs text-[var(--color-info-text)]/70">Gemini 3 Flash</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--color-info)] border-t-transparent animate-spin" />
                </div>

                {/* Extracted data preview */}
                <div className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">Extraherad data</p>
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Material</span>
                      <span className="font-medium text-[var(--color-text-primary)]">Trä</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Vikt</span>
                      <span className="font-medium text-[var(--color-text-primary)]">1,250 kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Datum</span>
                      <span className="font-medium text-[var(--color-text-primary)]">2026-01-15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-muted)]">Mottagare</span>
                      <span className="font-medium text-[var(--color-text-primary)]">Ragn-Sells</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -bottom-4 -left-4 bg-[var(--color-bg-elevated)] rounded-lg border border-[var(--color-border)] shadow-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
              <span className="text-xs font-medium text-[var(--color-text-primary)]">System Online</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Hur det fungerar</h2>
            <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              Tre enkla steg från kaotiska dokument till strukturerad data
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Ladda upp",
                description: "Dra och släpp dina PDF-fakturor eller Excel-filer. Vi stöder batch-uppladdning."
              },
              {
                step: "02",
                icon: Brain,
                title: "AI analyserar",
                description: "Vår AI extraherar automatiskt material, vikt, datum, adress och mottagare."
              },
              {
                step: "03",
                icon: FileCheck,
                title: "Verifiera & Exportera",
                description: "Granska extraherad data, gör justeringar och exportera till Excel."
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-[var(--color-bg-elevated)] rounded-2xl p-8 border border-[var(--color-border)] h-full hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)] transition-all">
                  <div className="text-5xl font-bold text-[var(--color-accent)]/10 mb-4">{item.step}</div>
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-muted)] flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-[var(--color-accent)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{item.title}</h3>
                  <p className="text-[var(--color-text-secondary)]">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRight className="w-8 h-8 text-[var(--color-border-strong)]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">Kraftfulla funktioner</h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Allt du behöver för effektiv avfallsdatahantering
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "Multi-modell AI",
              description: "Välj mellan Gemini, GPT eller Claude. Använd din egen API-nyckel (BYOK)."
            },
            {
              icon: FileText,
              title: "PDF & Excel",
              description: "Stöd för både skannade PDF-fakturor och Excel-rapporter med komplex struktur."
            },
            {
              icon: Shield,
              title: "Säkerhet först",
              description: "AES-256 kryptering, Row Level Security och full GDPR-kompatibilitet."
            },
            {
              icon: BarChart3,
              title: "Analys & Rapporter",
              description: "Visualisera avfallsdata med interaktiva diagram och exporterbara rapporter."
            },
            {
              icon: Clock,
              title: "Automatisk granskning",
              description: "AI föreslår godkännande baserat på konfidensgrad. Du behåller kontrollen."
            },
            {
              icon: Cpu,
              title: "Azure Integration",
              description: "Automatisk synkronisering till Azure Blob Storage för sömlös integration."
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-[var(--color-bg-elevated)] rounded-xl p-6 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)] transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-accent-muted)] flex items-center justify-center mb-4 transition-colors">
                <feature.icon className="w-5 h-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--color-text-muted)]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[var(--color-accent)]">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Redo att automatisera din datahantering?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Kom igång gratis idag. Inget kreditkort krävs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-[var(--color-accent)] font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg flex items-center gap-2"
            >
              Skapa konto gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-colors"
            >
              Se priser
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="font-bold text-[var(--color-text-primary)]">Vextra AI</span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
                Intelligent dokumentextraktion för avfallsbranschen. Verify + Extract = Vextra.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <li><Link href="/pricing" className="hover:text-[var(--color-text-primary)] transition-colors">Priser</Link></li>
                <li><Link href="/login" className="hover:text-[var(--color-text-primary)] transition-colors">Logga in</Link></li>
                <li><Link href="/signup" className="hover:text-[var(--color-text-primary)] transition-colors">Registrera</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-4">Juridik</h4>
              <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <li><Link href="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">Villkor</Link></li>
                <li><Link href="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">Integritet</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              © 2026 Vextra AI. Alla rättigheter förbehållna.
            </p>
            <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                Alla system online
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
