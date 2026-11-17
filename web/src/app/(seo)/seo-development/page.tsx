import type { Metadata } from "next";
import { connection } from "next/server";
import { SeoDevelopmentWorkspace } from "@/components/seo-development/seo-development-workspace";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.seoDevelopmentPage.hero.title,
    description: dict.seoDevelopmentPage.metaDescription,
  };
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default async function SeoDevelopmentPage() {
  // Read the thresholds per request, so changing the env needs a restart
  // but no rebuild.
  await connection();
  const dict = await getDictionary(await getRequestLocale());

  return (
    <SeoDevelopmentWorkspace
      dict={dict}
      thresholds={{
        titleMaxLength: envNumber("SEO_DEV_TITLE_MAX_LENGTH", 60),
        minProducts: envNumber("SEO_DEV_MIN_PRODUCTS", 3),
        minInStockPercent: envNumber("SEO_DEV_MIN_IN_STOCK_PERCENT", 50),
      }}
    />
  );
}
