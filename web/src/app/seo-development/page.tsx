import type { Metadata } from "next";
import { connection } from "next/server";
import { SeoDevelopmentWorkspace } from "@/components/seo-development/seo-development-workspace";

export const metadata: Metadata = {
  title: "SEO Development",
  description:
    "Simulasi title, description, robots, canonical, dan internal link untuk halaman /products Astra Otopart.",
};

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export default async function SeoDevelopmentPage() {
  // Read the thresholds per request, so changing the env needs a restart
  // but no rebuild.
  await connection();

  return (
    <SeoDevelopmentWorkspace
      thresholds={{
        titleMaxLength: envNumber("SEO_DEV_TITLE_MAX_LENGTH", 60),
        minProducts: envNumber("SEO_DEV_MIN_PRODUCTS", 3),
        minInStockPercent: envNumber("SEO_DEV_MIN_IN_STOCK_PERCENT", 50),
      }}
    />
  );
}
