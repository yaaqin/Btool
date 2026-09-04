"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/locales";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const LABELS: Record<Locale, string> = {
  en: "EN",
  id: "ID",
};

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const next = e.currentTarget.dataset.locale as Locale | undefined;
    if (!next || next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium">
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          data-locale={code}
          onClick={handleClick}
          aria-pressed={locale === code}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
