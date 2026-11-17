import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard-pln/dashboard-workspace";
import historyJson from "@/data/dashboard-pln/history.json";
import sitesJson from "@/data/dashboard-pln/sites.json";
import type { HistoryPoint, RawSite } from "@/lib/dashboard-pln";

export const metadata: Metadata = {
  title: "Dashboard PLTD Hybrid",
  description:
    "Prototipe dashboard monitoring PLTD simple hybrid (BESS + diesel generator) dengan data contoh berformat payload Wiraky.",
};

export default function DashboardPlnPage() {
  return (
    <DashboardWorkspace
      rawSites={sitesJson.sites as RawSite[]}
      history={historyJson.sites as Record<string, HistoryPoint[]>}
      // Dummy data is a frozen snapshot, so "now" is its generation time —
      // otherwise every site would read as offline. Swap for Date.now()/1000
      // once real data flows in.
      now={sitesJson.generatedAt}
    />
  );
}
