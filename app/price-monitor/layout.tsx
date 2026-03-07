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
  PenLine,
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
    { href: "/price-monitor/manual-entry", label: t("manualEntry"), icon: PenLine, exact: false },
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
      <div className="simplitics-theme flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-10">
          {/* Logo area */}
          <div className="p-6 border-b border-gray-100">
            <img src="https://www.simplitics.se/logo.svg" alt="Simplitics" className="h-5" />
            <p className="text-gray-400 text-[10px] mt-0.5 tracking-wide">Simplifying Analytics</p>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active 
                      ? 'bg-pink-50 text-pink-600 font-medium border-l-2 border-pink-500 rounded-l-none' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-pink-600' : 'text-gray-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Language / User section at bottom */}
          <div className="p-4 border-t border-gray-100 flex flex-col gap-4">
            <LanguageSwitcher />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                N
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-900 font-medium truncate">Niklas Elm</p>
                <p className="text-xs text-gray-400 truncate">Simplitics</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
