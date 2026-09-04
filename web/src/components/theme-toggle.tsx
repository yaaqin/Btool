"use client";

import { useRouter } from "next/navigation";
import { MoonIcon, SunIcon } from "@/components/icons";
import { THEME_COOKIE, type Theme } from "@/i18n/theme-constants";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ThemeToggle({
  theme,
  lightLabel,
  darkLabel,
}: {
  theme: Theme;
  lightLabel: string;
  darkLabel: string;
}) {
  const router = useRouter();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    document.documentElement.setAttribute("data-theme", next);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? lightLabel : darkLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {theme === "dark" ? (
        <SunIcon className="h-4 w-4" />
      ) : (
        <MoonIcon className="h-4 w-4" />
      )}
    </button>
  );
}
