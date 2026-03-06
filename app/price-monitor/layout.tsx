"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ToastProvider } from "@/components/ui/index";
import { LanguageSwitcher } from "@/components/price-monitor/language-switcher";
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
      <div style={{ background: "var(--color-bg)", color: "var(--color-text-primary)", minHeight: "100vh" }}>
        {/* Sub-nav bar */}
        <div
          className="border-b px-6"
          style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                    style={{
                      borderColor: active ? "var(--color-accent)" : "transparent",
                      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
