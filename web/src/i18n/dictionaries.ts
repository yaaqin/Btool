import "server-only";
import type { Locale } from "./locales";

const dictionaries = {
  en: () => import("./messages/en.json").then((m) => m.default),
  id: () => import("./messages/id.json").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

export type { Locale };
