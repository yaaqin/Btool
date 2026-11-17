"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Theme } from "@/i18n/theme-constants";

const LINKS = [
  { href: "/dashboard-pln", label: "Dashboard" },
  { href: "/dashboard-pln/catalog", label: "Katalog data" },
];

export function PlnHeader({ theme }: { theme: Theme }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/dashboard-pln" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Monitoring PLTD Hybrid</span>
            <span className="hidden text-xs text-muted-foreground sm:block">BESS + Diesel Generator</span>
          </span>
        </Link>
        <nav aria-label="Navigasi dashboard" className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <span className="ml-1">
            <ThemeToggle theme={theme} lightLabel="Mode terang" darkLabel="Mode gelap" />
          </span>
        </nav>
      </div>
    </header>
  );
}
