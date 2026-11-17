"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  evaluateAlerts,
  fmt,
  fmtTime,
  formatValue,
  parseSite,
  powerSource,
  siteStatus,
  type Alert,
  type HistoryPoint,
  type RawSite,
  type Site,
  type SiteStatus,
} from "@/lib/dashboard-pln";
import { PowerFlow } from "./power-flow";
import { TrendChart } from "./trend-chart";

const STATUS: Record<SiteStatus, { label: string; icon: string; pill: string; ring: string }> = {
  normal: { label: "Normal", icon: "●", pill: "bg-success-bg text-success", ring: "border-success/40" },
  warning: { label: "Warning", icon: "▲", pill: "bg-warning-bg text-warning", ring: "border-warning/50" },
  critical: { label: "Bahaya", icon: "◆", pill: "bg-critical-bg text-critical", ring: "border-critical/60" },
  offline: { label: "Offline", icon: "○", pill: "bg-muted text-muted-foreground", ring: "border-border" },
};

export function DashboardWorkspace({
  rawSites,
  history,
  now,
}: {
  rawSites: RawSite[];
  history: Record<string, HistoryPoint[]>;
  now: number;
}) {
  const sites = useMemo(
    () =>
      rawSites.map((raw) => {
        const site = parseSite(raw, now);
        const alerts = evaluateAlerts(site);
        return { site, alerts, status: siteStatus(site, alerts) };
      }),
    [rawSites, now],
  );
  const [selectedId, setSelectedId] = useState(sites[0]?.site.id);
  const selected = sites.find((s) => s.site.id === selectedId) ?? sites[0];
  if (!selected) return null;

  const counts = sites.reduce(
    (acc, s) => ({ ...acc, [s.status]: acc[s.status] + 1 }),
    { normal: 0, warning: 0, critical: 0, offline: 0 } as Record<SiteStatus, number>,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Monitoring PLN · PLTD Simple Hybrid
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard BESS + Diesel Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data contoh (dummy) dengan format payload Wiraky · snapshot {fmtTime(now, true)} WIB
          </p>
        </div>
      </header>

      {/* Fleet overview + site picker */}
      <section aria-label="Daftar site" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1 font-medium">{sites.length} site</span>
          {(Object.keys(STATUS) as SiteStatus[]).map((k) => (
            <span key={k} className={`rounded-full px-3 py-1 font-medium ${STATUS[k].pill}`}>
              {STATUS[k].icon} {STATUS[k].label}: {counts[k]}
            </span>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sites.map(({ site, alerts, status }) => {
            const active = site.id === selected.site.id;
            const crit = alerts.filter((a) => a.severity === "critical").length;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => setSelectedId(site.id)}
                aria-pressed={active}
                className={`flex flex-col gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition ${
                  active ? "ring-2 ring-primary" : "hover:bg-muted/50"
                } ${STATUS[status].ring}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-sm font-semibold">{site.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {site.raw.location.province}
                    </span>
                  </span>
                  <StatusPill status={status} />
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span className="whitespace-nowrap">Beban {fmt(site.loadKw)} kW</span>
                  <span className="whitespace-nowrap">SOC {fmt(site.battery.soc, 0)}%</span>
                  <span>
                    {alerts.length} alert{crit ? ` (${crit} bahaya)` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <SiteDetail
        site={selected.site}
        alerts={selected.alerts}
        status={selected.status}
        history={history[selected.site.id] ?? []}
      />
    </div>
  );
}

function SiteDetail({
  site,
  alerts,
  status,
  history,
}: {
  site: Site;
  alerts: Alert[];
  status: SiteStatus;
  history: HistoryPoint[];
}) {
  const critical = alerts.filter((a) => a.severity === "critical");
  // Cells that triggered an alert get highlighted where they're shown.
  const flagged = new Map(alerts.map((a) => [`${a.rule.metric}|${a.source}`, a.severity]));
  const flag = (metric: string, source: string) => flagged.get(`${metric}|${source}`);
  const sys = site.raw.system;

  return (
    <section aria-label={`Detail ${site.name}`} className="flex flex-col gap-6">
      {(status === "critical" || status === "offline") && (
        <div
          role="alert"
          className={`flex flex-col gap-1 rounded-2xl border-2 px-5 py-4 ${
            status === "offline"
              ? "border-border bg-muted"
              : "border-critical bg-critical-bg"
          }`}
        >
          <p className={`text-sm font-bold ${status === "offline" ? "" : "text-critical"}`}>
            {status === "offline"
              ? `○ OFFLINE: data terakhir ${fmt(site.dataAgeMin, 0)} menit yang lalu`
              : `◆ BAHAYA: ${critical.length} kondisi kritis di ${site.name}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {status === "offline"
              ? "Angka di bawah adalah data terakhir yang diterima, bukan kondisi sekarang."
              : [...new Set(critical.map((a) => a.rule.title))].join(" · ")}
          </p>
        </div>
      )}

      {/* Site header */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{site.name}</h2>
              <StatusPill status={status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {site.id} · {site.raw.location.regency}, {site.raw.location.province}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Info label="Sumber daya aktif" value={powerSource(site)} />
            <Info label="Data terakhir" value={`${fmtTime(site.raw.lastSeen)} WIB`} />
            <Info label="Inverter" value={`${sys.inverterCount} × ${sys.inverterRatedKw} kW`} />
            <Info label="Baterai · DG" value={`${sys.batteryKwh} kWh · ${sys.dgRatedKva} kVA`} />
          </dl>
        </div>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Beban" value={fmt(site.loadKw)} unit="kW" sub="Meter 3.1 · ke trafo 20 kV" />
        <Tile
          label="Diesel Generator"
          value={fmt(site.dg.kw)}
          unit="kW"
          sub={`${site.dg.status} · ${fmt(site.dg.loadingPct, 0)}% kapasitas`}
          tone={flag("dg.status", "DG 5.1")}
        />
        <Tile
          label="Baterai"
          value={fmt(Math.abs(site.battery.kw))}
          unit="kW"
          sub={site.battery.state}
        />
        <Tile
          label="SOC"
          value={fmt(site.battery.soc, 0)}
          unit="%"
          sub={
            site.battery.autonomyH === null
              ? "Autonomi —"
              : `Autonomi ± ${fmt(site.battery.autonomyH)} jam`
          }
          tone={flag("battery.soc", "Inverter 4.1")}
          meter={site.battery.soc}
        />
        <Tile
          label="Bahan bakar"
          value={fmt(site.dg.fuelPct, 0)}
          unit="%"
          sub={`${fmt(site.dg.fuelL, 0)} / ${sys.dgTankCapacityL} L`}
          tone={flag("dg.fuelPct", "DG 5.1")}
          meter={site.dg.fuelPct}
        />
        <Tile
          label="SOH baterai"
          value={fmt(site.battery.soh, 0)}
          unit="%"
          sub={`± ${fmt(site.battery.energyKwh)} kWh tersisa`}
          tone={flag("battery.soh", "Inverter 4.1")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle
            title="Aliran daya"
            hint={
              site.pfAssumed
                ? `kW dihitung dari V × A × PF ${site.pf} (asumsi)`
                : `kW dihitung dari V × A × PF ${site.pf}`
            }
          />
          <div className="mt-3">
            <PowerFlow site={site} />
          </div>
        </Card>
        <AlertList alerts={alerts} />
      </div>

      {history.length > 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <TrendChart
              title="Daya 24 jam (kW)"
              unit="kW"
              times={history.map((h) => h.t)}
              series={[
                { key: "load", label: "Beban", color: "var(--series-1)", values: history.map((h) => h.load) },
                { key: "dg", label: "DG", color: "var(--series-2)", values: history.map((h) => h.dg) },
                { key: "bess", label: "Baterai", color: "var(--series-3)", values: history.map((h) => h.bess) },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Baterai positif = discharge (memasok beban), negatif = charge (diisi DG).
            </p>
          </Card>
          <Card>
            <TrendChart
              title="SOC baterai 24 jam (%)"
              unit="%"
              domain={[0, 100]}
              area
              times={history.map((h) => h.t)}
              series={[
                { key: "soc", label: "SOC", color: "var(--series-1)", values: history.map((h) => h.soc) },
              ]}
              thresholds={[
                { value: 20, label: "Warning 20%", tone: "warning" },
                { value: 10, label: "Bahaya 10%", tone: "critical" },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Pola hybrid: baterai menopang beban sampai SOC rendah, lalu DG menyala dan mengisi ulang.
            </p>
          </Card>
        </div>
      )}

      {/* Devices */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card flush>
          <div className="p-5 pb-3">
            <CardTitle title="kWh Meter (3 titik ukur)" hint="Tegangan fasa-netral & arus per fasa" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm tabular-nums">
              <thead>
                <tr className="border-y border-border/60 bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-semibold">Meter</th>
                  <th className="px-3 py-2 font-semibold">V R / S / T</th>
                  <th className="px-3 py-2 font-semibold">A R / S / T</th>
                  <th className="px-3 py-2 font-semibold">kW</th>
                  <th className="px-5 py-2 font-semibold">Unbalance</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(site.meters).map((m) =>
                  m ? (
                    <tr key={m.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-5 py-2.5">
                        <span className="font-medium">{m.label}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{m.id}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {m.v.map((v, i) => (
                          <span key={i}>
                            {i > 0 && <span className="text-muted-foreground"> / </span>}
                            <Value tone={flag("meter.phaseVoltage", `${m.id} fasa ${"RST"[i]}`)}>
                              {fmt(v, 1)}
                            </Value>
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2.5">{m.a.map((a) => fmt(a, 1)).join(" / ")}</td>
                      <td className="px-3 py-2.5 font-medium">{fmt(m.kw)}</td>
                      <td className="px-5 py-2.5">
                        <Value tone={flag("meter.currentUnbalance", `Meter ${m.id}`)}>
                          {fmt(m.unbalancePct, 1)}%
                        </Value>
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle title="Hybrid inverter & baterai" hint="Payload 4.1 dan 4.2 (berbagi 1 bank baterai)" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {site.inverters.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="flex items-center justify-between">
                  <span className="font-medium">Inverter {inv.id}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{inv.state}</span>
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                  <Row k="Daya AC" v={`${fmt(Math.abs(inv.kw))} kW`} />
                  <Row
                    k="Beban"
                    v={
                      <Value tone={flag("inverter.loadingPct", `Inverter ${inv.id}`)}>
                        {fmt(inv.loadingPct, 0)}%
                      </Value>
                    }
                  />
                  <Row k="V baterai" v={`${fmt(inv.vb, 2)} V`} />
                  <Row k="A baterai" v={`${fmt(inv.ab, 1)} A`} />
                </dl>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm tabular-nums sm:grid-cols-3">
            <Row
              k="Tegangan bank"
              v={<Value tone={flag("battery.voltage", "Inverter 4.1")}>{fmt(site.battery.voltage, 2)} V</Value>}
            />
            <Row
              k="Arus total"
              v={`${fmt(site.battery.currentA, 1)} A`}
            />
            <Row
              k={<>Suhu <Proposed /></>}
              v={
                site.battery.tempC === undefined ? (
                  "—"
                ) : (
                  <Value tone={flag("battery.tempC", "BMS")}>{fmt(site.battery.tempC, 1)} °C</Value>
                )
              }
            />
            <Row
              k={<>Sel min / maks <Proposed /></>}
              v={
                site.battery.cellVmin === undefined
                  ? "—"
                  : `${fmt(site.battery.cellVmin, 2)} / ${fmt(site.battery.cellVmax ?? 0, 2)} V`
              }
            />
          </dl>
        </Card>

        <Card>
          <CardTitle title="Diesel generator" hint="Payload 5.1 + data usulan" />
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm tabular-nums sm:grid-cols-3">
            <Row k="Status" v={<Value tone={flag("dg.status", "DG 5.1")}>{site.dg.status}</Value>} />
            <Row k="Daya (meter 1.1)" v={`${fmt(site.dg.kw)} kW`} />
            <Row k="BBM" v={<Value tone={flag("dg.fuelPct", "DG 5.1")}>{fmt(site.dg.fuelL, 0)} L</Value>} />
            <Row
              k={<>Jam operasi <Proposed /></>}
              v={site.dg.runHours === undefined ? "—" : `${site.dg.runHours.toLocaleString("id-ID")} jam`}
            />
            <Row
              k={<>Air pendingin <Proposed /></>}
              v={
                site.dg.coolantC === undefined ? (
                  "—"
                ) : (
                  <Value tone={flag("dg.coolantC", "DG 5.1")}>{fmt(site.dg.coolantC, 0)} °C</Value>
                )
              }
            />
            <Row
              k={<>Frekuensi <Proposed /></>}
              v={
                site.frequencyHz === undefined ? (
                  "—"
                ) : (
                  <Value tone={flag("grid.frequencyHz", "Meter 3.1")}>{fmt(site.frequencyHz, 2)} Hz</Value>
                )
              }
            />
          </dl>
        </Card>

        <Card>
          <CardTitle title="Keamanan & lingkungan" hint="Dry contact IO 6.1 dan sensor ruang (semua usulan)" />
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm tabular-nums sm:grid-cols-4">
            <Row
              k={<>Pintu kabinet <Proposed /></>}
              v={
                site.io.door === null ? (
                  "—"
                ) : (
                  <Value tone={flag("io.door", "IO 6.1")}>
                    {site.io.door === "OPEN" ? "TERBUKA" : "Tertutup"}
                  </Value>
                )
              }
            />
            <Row
              k={<>DG RUN contact <Proposed /></>}
              v={site.io.dgRun === null ? "—" : site.io.dgRun ? "ON" : "OFF"}
            />
            <Row
              k={<>Suhu ruang <Proposed /></>}
              v={site.env.ambientC === undefined ? "—" : `${fmt(site.env.ambientC, 1)} °C`}
            />
            <Row
              k={<>Kelembapan <Proposed /></>}
              v={site.env.humidityPct === undefined ? "—" : `${fmt(site.env.humidityPct, 0)} %`}
            />
          </dl>
        </Card>
      </div>

      <RawPayloads site={site} />
    </section>
  );
}

function AlertList({ alerts }: { alerts: Alert[] }) {
  return (
    <Card flush>
      <div className="flex items-center justify-between p-5 pb-3">
        <CardTitle title="Alert aktif" />
        <span className="text-xs text-muted-foreground">{alerts.length} alert</span>
      </div>
      {alerts.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-success">● Semua parameter dalam batas normal.</p>
      ) : (
        <ul className="max-h-[22rem] divide-y divide-border/60 overflow-y-auto border-t border-border/60">
          {alerts.map((a) => (
            <li key={`${a.rule.id}-${a.source}`} className="flex gap-3 px-5 py-3">
              <span
                className={`mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  a.severity === "critical" ? "bg-critical-bg text-critical" : "bg-warning-bg text-warning"
                }`}
              >
                {a.severity === "critical" ? "◆ Bahaya" : "▲ Warning"}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium">{a.rule.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.source} · nilai{" "}
                  <span className="font-medium text-foreground">{formatValue(a.value, a.rule.unit)}</span>
                  {a.rule.source === "usulan" && (
                    <>
                      {" "}
                      · <Proposed />
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs">→ {a.rule.action}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RawPayloads({ site }: { site: Site }) {
  const payloads = [...site.raw.payloads, ...(site.raw.proposed.io ? [site.raw.proposed.io] : [])];
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Payload mentah dari gateway ({payloads.length} pesan)
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Persis seperti format JSON di dokumen Wiraky. Arti tiap posisi ada di{" "}
          <Link href="/dashboard-pln/catalog#perangkat" className="text-primary underline">
            katalog data
          </Link>
          .
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">
          {payloads.map((p) => JSON.stringify(p)).join("\n")}
        </pre>
      </details>
    </Card>
  );
}

// --- small building blocks ---------------------------------------------------

function StatusPill({ status }: { status: SiteStatus }) {
  const s = STATUS[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.pill}`}>
      {s.icon} {s.label}
    </span>
  );
}

function Card({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${flush ? "" : "p-5"}`}>
      {children}
    </div>
  );
}

function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Value({ tone, children }: { tone?: "critical" | "warning"; children: ReactNode }) {
  if (!tone) return <>{children}</>;
  return (
    <span
      className={`rounded px-1 font-semibold ${
        tone === "critical" ? "bg-critical-bg text-critical" : "bg-warning-bg text-warning"
      }`}
      title={tone === "critical" ? "Bahaya" : "Warning"}
    >
      {tone === "critical" ? "◆ " : "▲ "}
      {children}
    </span>
  );
}

function Proposed() {
  return (
    <span
      className="rounded bg-info-bg px-1 py-px text-[9px] font-semibold uppercase text-info"
      title="Belum ada di format Wiraky saat ini — data usulan"
    >
      usulan
    </span>
  );
}

function Tile({
  label,
  value,
  unit,
  sub,
  tone,
  meter,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone?: "critical" | "warning";
  // 0–100 fill bar under the number.
  meter?: number;
}) {
  const border =
    tone === "critical" ? "border-critical/60" : tone === "warning" ? "border-warning/60" : "border-border";
  const bar = tone === "critical" ? "bg-critical" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border bg-card p-4 shadow-sm ${border}`}>
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        {tone && (
          <span className={tone === "critical" ? "text-critical" : "text-warning"}>
            {tone === "critical" ? "◆ Bahaya" : "▲ Warning"}
          </span>
        )}
      </span>
      <span className="text-2xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
      </span>
      {meter !== undefined && (
        <span className="h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className={`block h-full rounded-full ${bar}`}
            style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
          />
        </span>
      )}
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}
