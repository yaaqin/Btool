"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon, TagIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";

const LINKS = [
  { href: "/", icon: SearchIcon, labelKey: "crawler" } as const,
  { href: "/metadata", icon: TagIcon, labelKey: "metadata" } as const,
];

// Fixed, vertically centered on the right edge — a quick way to jump
// between the tool's pages without scrolling back up to the header.
// sm+ only: on a phone-width screen there's no room for a floating dock
// that doesn't cover content, and the header links already cover it.
export function SideNav({ dict }: { dict: Dictionary }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 rounded-full border border-border/60 bg-card/60 p-1.5 shadow-lg backdrop-blur-xl sm:flex"
    >
      {LINKS.map(({ href, icon: Icon, labelKey }) => {
        const active = pathname === href;
        const label = dict.header[labelKey];
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </nav>
  );
}
