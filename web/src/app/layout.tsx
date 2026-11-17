import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

// Shared shell only (fonts, theme, locale). Each section brings its own
// chrome: (seo)/layout.tsx for the SEO tool, dashboard-pln/layout.tsx for
// the PLN monitoring dashboard.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getRequestLocale();
  const theme = await getRequestTheme();

  return (
    <html
      lang={locale}
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
