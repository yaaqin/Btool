import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { SideNav } from "@/components/side-nav";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";
import { getRequestTheme } from "@/i18n/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO Audit Tool",
  description:
    "Compare raw HTML against the rendered DOM and see what crawlers actually read.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  const theme = await getRequestTheme();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header dict={dict} locale={locale} theme={theme} />
        <SideNav dict={dict} />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
