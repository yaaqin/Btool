import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { SideNav } from "@/components/side-nav";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";
import { getRequestTheme } from "@/i18n/theme";

export const metadata: Metadata = {
  title: "SEO Audit Tool",
  description:
    "Compare raw HTML against the rendered DOM and see what crawlers actually read.",
};

export default async function SeoLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const theme = await getRequestTheme();
  const dict = await getDictionary(locale);

  return (
    <>
      <Header dict={dict} locale={locale} theme={theme} />
      <SideNav dict={dict} />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
