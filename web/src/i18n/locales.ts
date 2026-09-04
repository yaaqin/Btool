// Locale list and constants only — no dictionary content or next/headers
// import here, so this is safe to import from Client Components (unlike
// dictionaries.ts and locale.ts, which are server-only).
export const locales = ["en", "id"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "locale";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);
