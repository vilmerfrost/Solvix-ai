"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/index";
import { LanguageSwitcher } from "@/components/price-monitor/language-switcher";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Truck,
  FileText,
  Settings,
  BarChart3,
  Scale,
  Layers3,
  Tags,
  FileSpreadsheet,
} from "lucide-react";

export default function PriceMonitorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [settings, setSettings] = useState<{ company_name?: string; company_logo_url?: string; primary_color?: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('settings')
        .select('company_name, company_logo_url, primary_color')
        .eq('user_id', session.user.id)
        .single();
      
      if (data) {
        setSettings(data);
        if (data.primary_color) {
          // Allow override if specifically set, otherwise use Simplitics defaults from CSS
          // document.documentElement.style.setProperty('--color-accent', data.primary_color);
        }
      }
    }
    loadSettings();
  }, []);

  const navItems = [
    { href: "/price-monitor", label: t("overview"), icon: LayoutDashboard, exact: true },
    { href: "/price-monitor/products", label: t("products"), icon: Package, exact: false },
    { href: "/price-monitor/alerts", label: t("alerts"), icon: AlertTriangle, exact: false },
    { href: "/price-monitor/suppliers", label: t("suppliers"), icon: Truck, exact: false },
    { href: "/price-monitor/agreements", label: t("agreements"), icon: FileText, exact: false },
    { href: "/price-monitor/spend", label: t("spend"), icon: BarChart3, exact: true },
    { href: "/price-monitor/spend/compare", label: t("compare"), icon: Scale, exact: false },
    { href: "/price-monitor/spend/groups", label: t("groups"), icon: Layers3, exact: false },
    { href: "/price-monitor/spend/categories", label: t("categories"), icon: Tags, exact: false },
    { href: "/price-monitor/reports", label: t("reports"), icon: FileSpreadsheet, exact: false },
    { href: "/price-monitor/settings", label: t("settings"), icon: Settings, exact: false },
  ];

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <ToastProvider>
      <div className="simplitics-theme dark flex h-screen overflow-hidden" style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}>
        {/* Sidebar */}
        <aside className="w-64 border-r flex flex-col flex-shrink-0" style={{ backgroundColor: "#000000", borderColor: "var(--color-border)" }}>
          {/* Logo area */}
          <div className="p-6 border-b" style={{ borderColor: "var(--color-border)" }}>
            <img src="/simplitics-logo.png" alt="Simplitics" className="h-8 w-auto object-contain" />
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Prisövervakning</p>
          </div>
          
          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active ? "var(--color-accent-muted)" : "transparent",
                    color: active ? "var(--color-accent-text)" : "var(--color-text-secondary)",
                    borderLeft: active ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Language / User section at bottom */}
          <div className="p-4 border-t flex flex-col gap-4" style={{ borderColor: "var(--color-border)" }}>
            <LanguageSwitcher />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold">
                N
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white truncate">Niklas Elm</p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>Simplitics</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-black">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
