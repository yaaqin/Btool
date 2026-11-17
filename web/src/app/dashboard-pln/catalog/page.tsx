import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import catalog from "@/data/dashboard-pln/catalog.json";
import { ALERT_RULES, formatThreshold } from "@/lib/dashboard-pln";

export const metadata: Metadata = {
  title: "Katalog Data PLTD Hybrid",
  description:
    "Katalog data monitoring PLTD simple hybrid: topologi, format payload Wiraky per perangkat, data turunan, usulan data tambahan, dan aturan alert.",
};

const SECTIONS = [
  { id: "topologi", label: "Topologi" },
  { id: "alur", label: "Alur data" },
  { id: "perangkat", label: "Format payload" },
  { id: "turunan", label: "Data turunan" },
  { id: "widget", label: "Isi dashboard" },
  { id: "alert", label: "Aturan alert" },
  { id: "usulan", label: "Data yang perlu diminta" },
  { id: "pertanyaan", label: "Pertanyaan ke Wiraky" },
];

const PRIORITY_TONE: Record<string, string> = {
  Wajib: "bg-critical-bg text-critical",
  Penting: "bg-warning-bg text-warning",
  Opsional: "bg-muted text-muted-foreground",
};

const OWNER_TONE: Record<string, string> = {
  Wiraky: "bg-info-bg text-info",
  "Tim dashboard": "bg-success-bg text-success",
  Disepakati: "bg-warning-bg text-warning",
};

export default function CatalogPage() {
  const { meta, topology, dataFlow, idConvention, devices, derived, widgets, gaps, questions, responsibilities } =
    catalog;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-warning-bg px-2.5 py-1 font-medium text-warning">{meta.status}</span>
          <Link href="/dashboard-pln" className="text-primary hover:underline">
            ← Kembali ke dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{meta.title}</h1>
        <p className="max-w-3xl text-muted-foreground sm:text-lg">{meta.lead}</p>
        <p className="max-w-3xl text-xs text-muted-foreground">{meta.source}</p>
        <nav aria-label="Isi halaman" className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <Section id="topologi" eyebrow="Topologi" title="Simple hybrid: baterai + diesel generator di PLTD" intro={topology.summary}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topology.components.map((c) => (
            <Card key={c.name}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{c.name}</h3>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">ID {c.deviceId}</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-primary">{c.spec}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.role}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="alur"
        eyebrow="Alur data"
        title="Wiraky menangani perangkat sampai cloud, dashboard menangani tampilan dan alert"
      >
        <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {dataFlow.map((s, i) => (
            <li key={s.step} className="flex flex-1 items-center gap-2 sm:flex-col sm:items-stretch">
              <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-bold text-muted-foreground">{i + 1}</p>
                <p className="text-sm font-semibold">{s.step}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${OWNER_TONE[s.owner]}`}>
                  {s.owner}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold">Tanggung jawab Wiraky (hardware)</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {responsibilities.wiraky.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Tanggung jawab tim dashboard</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {responsibilities.dashboard.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section
        id="perangkat"
        eyebrow="Format payload"
        title="Setiap pesan adalah array berurutan: arti nilai ditentukan posisinya"
        intro={`ID ditulis ${idConvention.format}. ${idConvention.explanation}`}
      >
        <div className="mb-6 flex flex-wrap gap-2">
          {idConvention.types.map((t) => (
            <span key={t.code} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs">
              <span className="font-mono font-bold text-primary">{t.code}</span> {t.name}
              <span className="text-muted-foreground"> · {t.position}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {devices.map((d) => (
            <Card key={d.key} flush>
              <div className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{d.name}</h3>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">ID {d.ids}</span>
                  <span className="text-xs text-muted-foreground">{d.protocol}</span>
                  {"proposed" in d && d.proposed && <ProposedBadge />}
                </div>
                <pre className="overflow-x-auto rounded-xl bg-muted px-4 py-3 font-mono text-xs">{d.example}</pre>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead>
                    <tr className="border-y border-border/60 bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-semibold">Posisi</th>
                      <th className="px-3 py-2 font-semibold">Field</th>
                      <th className="px-3 py-2 font-semibold">Satuan</th>
                      <th className="px-3 py-2 font-semibold">Normal</th>
                      <th className="px-5 py-2 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.fields.map((f) => (
                      <tr key={f.key} className="border-b border-border/60 align-top last:border-b-0">
                        <td className="px-5 py-2 font-mono text-xs">data[{f.index}]</td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{f.label}</span>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {f.key} · {f.type}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-xs ${f.unit.includes("?") ? "font-semibold text-warning" : ""}`}>
                          {f.unit}
                        </td>
                        <td className="px-3 py-2 text-xs">{f.normal}</td>
                        <td className="px-5 py-2 text-xs text-muted-foreground">{f.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Satuan bertanda <span className="font-semibold text-warning">?</span> belum pasti dan perlu dikonfirmasi ke Wiraky.
        </p>
      </Section>

      <Section
        id="turunan"
        eyebrow="Data turunan"
        title="Angka yang dihitung dashboard dari data mentah"
        intro="Perangkat hanya mengirim pengukuran dasar. Angka yang paling berguna bagi operator dihitung di sisi dashboard."
      >
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Nilai</th>
                  <th className="px-5 py-3 font-semibold">Rumus</th>
                  <th className="px-5 py-3 font-semibold">Gunanya</th>
                </tr>
              </thead>
              <tbody>
                {derived.map((d) => (
                  <tr key={d.name} className="border-b border-border/60 align-top last:border-b-0">
                    <td className="px-5 py-3 font-medium">{d.name}</td>
                    <td className="px-5 py-3 font-mono text-xs">{d.formula}</td>
                    <td className="px-5 py-3 text-muted-foreground">{d.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section
        id="widget"
        eyebrow="Isi dashboard"
        title="Yang biasanya tampil di dashboard monitoring BESS + genset"
        intro="Disarikan dari contoh dashboard di dokumen (site snapshot, power flow, alarm, peta site) dan praktik umum sistem monitoring site energi."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <Card key={w.widget}>
              <h3 className="text-sm font-semibold">{w.widget}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{w.shows}</p>
              <p className="mt-2 font-mono text-[11px] text-primary">{w.fields}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="alert"
        eyebrow="Aturan alert"
        title="Kapan status berubah jadi Warning atau Bahaya"
        intro="Aturan ini dibaca langsung oleh dashboard dari alert-rules.json, jadi mengubah ambang di file itu langsung mengubah perilaku alert. Satu kondisi Bahaya membuat status site jadi Bahaya."
      >
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Kondisi</th>
                  <th className="px-3 py-3 font-semibold">▲ Warning</th>
                  <th className="px-3 py-3 font-semibold">◆ Bahaya</th>
                  <th className="px-5 py-3 font-semibold">Kenapa penting · Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {ALERT_RULES.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 align-top last:border-b-0">
                    <td className="px-5 py-3">
                      <span className="font-medium">{r.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        {r.metric}
                        {r.source === "usulan" && <ProposedBadge />}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-warning">{formatThreshold(r, r.warning)}</td>
                    <td className="px-3 py-3 text-xs font-medium text-critical">{formatThreshold(r, r.critical)}</td>
                    <td className="px-5 py-3 text-xs">
                      <p className="text-muted-foreground">{r.why}</p>
                      <p className="mt-1">→ {r.action}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section
        id="usulan"
        eyebrow="Data yang perlu diminta"
        title="Yang belum ada di format Wiraky, tapi dibutuhkan untuk monitoring PLN"
        intro="Di dashboard, nilai-nilai ini diberi label USULAN. Tanpa data bertanda Wajib, beberapa angka utama hanya bisa diperkirakan."
      >
        <Card flush>
          <ul className="divide-y divide-border/60">
            {gaps.map((g) => (
              <li key={g.field} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                <span className={`h-fit w-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:w-20 sm:text-center ${PRIORITY_TONE[g.priority]}`}>
                  {g.priority}
                </span>
                <div className="text-sm">
                  <p className="font-medium">
                    {g.field} <span className="text-xs font-normal text-muted-foreground">· {g.device}</span>
                  </p>
                  <p className="text-muted-foreground">{g.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section id="pertanyaan" eyebrow="Pertanyaan ke Wiraky" title="Yang perlu dijawab sebelum integrasi data asli">
        <Card>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Card>
      </Section>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-1 max-w-3xl text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {intro && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Card({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return (
    <div className={`h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${flush ? "" : "p-5"}`}>
      {children}
    </div>
  );
}

function ProposedBadge() {
  return (
    <span className="rounded bg-info-bg px-1.5 py-px text-[10px] font-semibold uppercase text-info">usulan</span>
  );
}
