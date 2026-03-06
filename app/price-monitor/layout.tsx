"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/ui/index";
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
} from "lucide-react";

const navItems = [
  { href: "/price-monitor", label: "Översikt", icon: LayoutDashboard, exact: true },
  { href: "/price-monitor/products", label: "Produkter", icon: Package, exact: false },
  { href: "/price-monitor/alerts", label: "Varningar", icon: AlertTriangle, exact: false },
  { href: "/price-monitor/suppliers", label: "Leverantörer", icon: Truck, exact: false },
  { href: "/price-monitor/agreements", label: "Avtal", icon: FileText, exact: false },
  { href: "/price-monitor/spend", label: "Utgiftsöversikt", icon: BarChart3, exact: true },
  { href: "/price-monitor/spend/compare", label: "Leverantörsjämförelse", icon: Scale, exact: false },
  { href: "/price-monitor/spend/groups", label: "Produktgrupper", icon: Layers3, exact: false },
  { href: "/price-monitor/spend/categories", label: "Kategorier", icon: Tags, exact: false },
  { href: "/price-monitor/settings", label: "Inställningar", icon: Settings, exact: false },
];

export default function PriceMonitorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
