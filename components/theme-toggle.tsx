"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Only run on client
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
      localStorage.removeItem("theme");
    } else {
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
    }
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-secondary)]" />
    );
  }

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const icons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const labels = {
    light: "Ljust tema",
    dark: "Mörkt tema",
    system: "Systemtema",
  };

  const Icon = icons[theme];

  return (
    <button
      onClick={cycleTheme}
      className="
        w-9 h-9 rounded-lg 
        flex items-center justify-center
        bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
        border border-[var(--color-border)] hover:border-[var(--color-border-strong)]
        text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
        transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
      "
      title={labels[theme]}
      aria-label={labels[theme]}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// Compact dropdown version
export function ThemeDropdown() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", systemDark);
      localStorage.removeItem("theme");
    } else {
      root.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
    }
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-secondary)]" />;
  }

  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Ljust" },
    { value: "dark", icon: Moon, label: "Mörkt" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  const currentOption = options.find(o => o.value === theme)!;
  const Icon = currentOption.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="
          w-9 h-9 rounded-lg 
          flex items-center justify-center
          bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
          border border-[var(--color-border)] hover:border-[var(--color-border-strong)]
          text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
        "
        title={currentOption.label}
      >
        <Icon className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpen(false)} 
          />
          <div className="
            absolute right-0 mt-2 z-50
            bg-[var(--color-bg-elevated)] border border-[var(--color-border)]
            rounded-lg shadow-[var(--shadow-lg)] overflow-hidden
            min-w-[140px] py-1
          ">
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isActive = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2 text-left text-sm
                    flex items-center gap-2
                    transition-colors duration-100
                    ${isActive 
                      ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]" 
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    }
                  `}
                >
                  <OptionIcon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
