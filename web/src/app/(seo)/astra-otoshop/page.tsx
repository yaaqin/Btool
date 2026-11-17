import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  beforeAfter,
  businessBenefits,
  currentState,
  kpis,
  meta,
  openDecisions,
  phases,
  plpAdvantages,
  principles,
  risks,
  searches,
  teamImpact,
  urlLevels,
} from "@/content/astra-otoshop-plp";

export const metadata: Metadata = {
  title: "SEO Halaman Produk Astra Otoshop",
  description:
    "Rekomendasi SEO untuk Product Listing Page Astra Otoshop: masalah saat ini, cara kerja, dampak ke bisnis, dan cara mengukur hasilnya.",
};

const SECTIONS = [
  { id: "masalah", label: "Kondisi saat ini" },
  { id: "kenapa-plp", label: "Kenapa PLP" },
  { id: "cara-kerja", label: "Cara kerja" },
  { id: "dampak", label: "Sebelum & sesudah" },
  { id: "keuntungan", label: "Keuntungan bisnis" },
  { id: "tim", label: "Dampak ke tim" },
  { id: "risiko", label: "Risiko" },
  { id: "ukur", label: "Cara mengukur" },
  { id: "tahapan", label: "Tahapan" },
  { id: "keputusan", label: "Perlu diputuskan" },
];

export default function AstraOtoshopPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-warning-bg px-2.5 py-1 font-medium text-warning">
            {meta.status}
          </span>
          <span className="text-muted-foreground">{meta.date}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{meta.title}</h1>
        <p className="max-w-3xl text-muted-foreground sm:text-lg">{meta.lead}</p>
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

      <Section
        id="masalah"
        eyebrow="Kondisi saat ini"
        title="Metadata baru muncul setelah JavaScript jalan, dan isinya sama di semua halaman"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <p className="text-xs font-semibold text-muted-foreground">
              Isi HTML mentah dari server · <span className="font-mono">{currentState.url}</span>
            </p>
            <ul className="mt-4 flex flex-col divide-y divide-border/60">
              {currentState.rows.map((row) => (
                <li key={row.tag} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4">
                  <code className="w-fit shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs sm:w-48">
                    {row.tag}
                  </code>
                  <span className="text-sm">
                    {row.raw ?? <span className="text-critical">tidak ada</span>}
                    {row.note && (
                      <span className="block text-xs text-muted-foreground">{row.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="flex flex-col gap-4">
            {currentState.impacts.map((item) => (
              <Card key={item.title} tone="critical">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="kenapa-plp"
        eyebrow="Kenapa PLP"
        title="Orang mencari kebutuhan, bukan nama produk"
        intro="Jarang ada yang mengetik “GS Astra NS40ZL”. Yang dicari adalah kebutuhan, dan setiap pencarian seperti ini idealnya mendarat di halaman daftar produk yang tepat."
      >
        <div className="mb-6 flex flex-wrap gap-2">
          {searches.map((q) => (
            <span
              key={q}
              className="rounded-full border border-border bg-card px-3.5 py-2 text-sm shadow-sm"
            >
              🔍 {q}
            </span>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {plpAdvantages.map((item) => (
            <Card key={item.title}>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="cara-kerja"
        eyebrow="Cara kerja"
        title="Satu pintu /products, satu URL untuk setiap halaman yang bernilai"
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((p, i) => (
            <li key={p.title}>
              <Card>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold">Setiap level menjawab pencarian yang lebih spesifik</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Level</th>
                    <th className="py-2 pr-3 font-semibold">Contoh URL</th>
                    <th className="py-2 font-semibold">Menjawab</th>
                  </tr>
                </thead>
                <tbody>
                  {urlLevels.map((row) => (
                    <tr key={row.example} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-3 text-xs font-semibold text-primary">{row.level}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.example}</td>
                      <td className="py-2 text-muted-foreground">&ldquo;{row.answers}&rdquo;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold">PLP sebagai hub yang menghubungkan katalog</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Google menemukan halaman dengan mengikuti link. Setiap level menautkan level di bawahnya
              sampai ke halaman produk.
            </p>
            <div className="mt-4 font-mono text-xs">
              <HubNode label="Beranda" tone="muted">
                <HubNode label="/products/aki">
                  <HubNode label="/products/aki/mobil">
                    <HubNode label="/products/aki/mobil/gs-astra" leaf="produk, produk, …" />
                    <HubNode label="/products/aki/mobil/incoe" leaf="produk, …" />
                  </HubNode>
                  <HubNode label="/products/aki/motor" />
                  <HubNode label="/products/aki/gs-astra" />
                </HubNode>
              </HubNode>
            </div>
          </Card>
        </div>
      </Section>

      <Section id="dampak" eyebrow="Sebelum & sesudah" title="Apa yang berubah di mata mesin pencari">
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Area</th>
                  <th className="px-5 py-3 font-semibold">Sebelum (SPA lama)</th>
                  <th className="px-5 py-3 font-semibold">Sesudah</th>
                </tr>
              </thead>
              <tbody>
                {beforeAfter.map((row) => (
                  <tr key={row.area} className="border-b border-border/60 align-top last:border-b-0">
                    <td className="px-5 py-3 font-medium">{row.area}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.before}</td>
                    <td className="px-5 py-3">
                      <span className="text-success">✓</span> {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section id="keuntungan" eyebrow="Keuntungan bisnis" title="Kenapa ini layak dikerjakan">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businessBenefits.map((item) => (
            <Card key={item.title} tone="success">
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="tim" eyebrow="Dampak ke tim" title="Siapa mengerjakan apa">
        <div className="grid gap-4 sm:grid-cols-2">
          {teamImpact.map((item) => (
            <Card key={item.team}>
              <h3 className="text-sm font-semibold">{item.team}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="risiko" eyebrow="Risiko" title="Risiko dan cara mengatasinya">
        <div className="grid gap-4 sm:grid-cols-2">
          {risks.map((item) => (
            <Card key={item.risk}>
              <h3 className="text-sm font-semibold">
                <span className="text-warning">⚠</span> {item.risk}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.mitigation}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="ukur" eyebrow="Cara mengukur" title="Tanda-tanda keberhasilan">
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">KPI</th>
                  <th className="px-5 py-3 font-semibold">Sumber</th>
                  <th className="px-5 py-3 font-semibold">Yang diharapkan</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((row) => (
                  <tr key={row.kpi} className="border-b border-border/60 align-top last:border-b-0">
                    <td className="px-5 py-3 font-medium">{row.kpi}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.source}</td>
                    <td className="px-5 py-3">{row.expect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      <Section
        id="tahapan"
        eyebrow="Tahapan"
        title="Dikerjakan bertahap, mulai dari yang bisa langsung jalan di frontend"
      >
        <ol className="relative flex flex-col gap-4 border-l border-border pl-6">
          {phases.map((phase, i) => (
            <li key={phase.title} className="relative">
              <span className="absolute -left-[2.2rem] top-4 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-bold">
                {i + 1}
              </span>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{phase.title}</h3>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {phase.owner}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{phase.scope}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="keputusan"
        eyebrow="Perlu diputuskan"
        title="Keputusan yang masih perlu dikonfirmasi"
      >
        <Card flush>
          <ul className="divide-y divide-border/60">
            {openDecisions.map((d) => (
              <li key={d.q} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-sm">{d.q}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Usulan: <span className="font-medium text-foreground">{d.proposal}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-6 text-xs text-muted-foreground">{meta.note}</p>
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
      {intro && (
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{intro}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const CARD_TONES = {
  default: "border-border",
  critical: "border-critical/30",
  success: "border-success/30",
} as const;

function Card({
  children,
  tone = "default",
  flush = false,
}: {
  children: ReactNode;
  tone?: keyof typeof CARD_TONES;
  // No inner padding — for tables and lists that run edge to edge.
  flush?: boolean;
}) {
  return (
    <div
      className={`h-full overflow-hidden rounded-2xl border bg-card shadow-sm ${CARD_TONES[tone]} ${
        flush ? "" : "p-5"
      }`}
    >
      {children}
    </div>
  );
}

function HubNode({
  label,
  leaf,
  tone,
  children,
}: {
  label: string;
  // Product pages hanging off this node, shown as a trailing note.
  leaf?: string;
  tone?: "muted";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-1 ${
            tone === "muted" ? "bg-muted" : "bg-primary/10 text-primary"
          }`}
        >
          {label}
        </span>
        {leaf && <span className="text-muted-foreground">→ {leaf}</span>}
      </span>
      {children && (
        <div className="ml-3 flex flex-col gap-1.5 border-l border-border pl-4">{children}</div>
      )}
    </div>
  );
}
