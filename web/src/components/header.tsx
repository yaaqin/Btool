import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dictionary, Locale } from "@/i18n/dictionaries";
import type { Theme } from "@/i18n/theme-constants";

export function Header({
  dict,
  locale,
  theme,
}: {
  dict: Dictionary;
  locale: Locale;
  theme: Theme;
}) {
  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            S
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{dict.header.brand}</p>
            <p className="text-xs text-muted-foreground">
              {dict.header.tagline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/doc"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {dict.header.docs}
          </Link>
          <LanguageSwitcher locale={locale} />
          <ThemeToggle
            theme={theme}
            lightLabel={dict.header.theme.light}
            darkLabel={dict.header.theme.dark}
          />
        </div>
      </div>
    </header>
  );
}
