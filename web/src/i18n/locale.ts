import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, hasLocale, type Locale } from "./locales";

/**
 * Cookie wins if the user has picked a language before. Otherwise fall back
 * to a lightweight Accept-Language sniff, then defaultLocale.
 */
export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  if (cookieValue && hasLocale(cookieValue)) {
    return cookieValue;
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  if (acceptLanguage.toLowerCase().startsWith("id")) {
    return "id";
  }

  return defaultLocale;
}

export { LOCALE_COOKIE };
