"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/ui/index";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Truck,
  Settings,
  ChevronLeft,
  Menu,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { href: "/price-monitor", label: "Översikt", icon: LayoutDashboard, exact: true },
  { href: "/price-monitor/products", label: "Produkter", icon: Package, exact: false },
  { href: "/price-monitor/alerts", label: "Varningar", icon: AlertTriangle, exact: false },
  { href: "/price-monitor/suppliers", label: "Leverantörer", icon: Truck, exact: false },
  { href: "/price-monitor/settings", label: "Inställningar", icon: Settings, exact: false },
];

export default function PriceMonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(item: { href: string; exact: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col border-r
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Logo / title */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-accent)" }}
          >
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
            Prisövervakning
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ color: "var(--color-text-muted)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? "var(--color-accent-muted)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to main app */}
        <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Tillbaka till dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header
          className="flex items-center gap-3 px-4 py-3 border-b lg:hidden"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
            Prisövervakning
          </span>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
