import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PlnHeader } from "@/components/dashboard-pln/pln-header";
import { getRequestTheme } from "@/i18n/theme";

export const metadata: Metadata = {
  title: "Monitoring PLTD Hybrid",
  description: "Monitoring PLTD simple hybrid: baterai (BESS) + diesel generator.",
};

export default async function DashboardPlnLayout({ children }: { children: ReactNode }) {
  const theme = await getRequestTheme();

  return (
    <>
      <PlnHeader theme={theme} />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Prototipe frontend · data contoh (dummy) berformat payload Wiraky
      </footer>
    </>
  );
}
