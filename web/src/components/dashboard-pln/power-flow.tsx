import { fmt, type Site } from "@/lib/dashboard-pln";

// Single-line view of the hybrid topology: DG and battery/inverter feed
// the 380 V panel, which feeds the 20 kV step-up transformer and the
// load. Dashes move in the direction power flows; a line with no flow
// is drawn static and faint.
export function PowerFlow({ site }: { site: Site }) {
  const dgKw = site.dg.kw;
  const battKw = site.battery.kw; // + discharge (to panel), − charge (from panel)
  const loadKw = site.loadKw;
  const dgTone =
    site.dg.status === "FAULT" ? "critical" : site.dg.status === "RUN" ? "active" : "idle";

  return (
    <svg viewBox="0 0 640 260" className="h-auto w-full" role="img" aria-label="Diagram aliran daya">
      {/* DG → panel */}
      <Flow d="M150,60 H300 V112" kw={dgKw} />
      {/* battery ↔ panel */}
      <Flow d={battKw >= 0 ? "M150,200 H300 V148" : "M300,148 V200 H150"} kw={Math.abs(battKw)} />
      {/* panel → trafo → load */}
      <Flow d="M340,130 H440" kw={loadKw} />
      <Flow d="M500,130 H530" kw={loadKw} />

      <Label x={225} y={50} text={`${fmt(dgKw)} kW`} />
      <Label
        x={225}
        y={190}
        text={`${fmt(Math.abs(battKw))} kW ${battKw > 0.3 ? "→" : battKw < -0.3 ? "←" : ""}`}
      />
      <Label x={390} y={120} text={`${fmt(loadKw)} kW`} />

      <Node x={30} y={30} w={120} h={60} title="Diesel Generator" sub={site.dg.status} tone={dgTone} />
      <Node
        x={30}
        y={170}
        w={120}
        h={60}
        title="Inverter + Baterai"
        sub={`SOC ${fmt(site.battery.soc, 0)}% · ${site.battery.state}`}
        tone={site.battery.soc < 10 ? "critical" : site.battery.state === "IDLE" ? "idle" : "active"}
      />
      <Node x={260} y={112} w={80} h={36} title="Panel AC" sub="380 V" tone="neutral" />
      <Node x={440} y={110} w={60} h={40} title="Trafo" sub="20 kV" tone="neutral" />
      <Node x={530} y={100} w={90} h={60} title="Beban" sub="Rumah warga" tone="active" />
    </svg>
  );
}

function Flow({ d, kw }: { d: string; kw: number }) {
  const active = kw > 0.3;
  return (
    <path
      d={d}
      fill="none"
      strokeWidth={active ? 3 : 2}
      strokeLinecap="round"
      className={active ? "pln-flow stroke-primary" : "stroke-border"}
      strokeDasharray={active ? "6 6" : undefined}
    />
  );
}

function Label({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-foreground text-[12px] font-semibold tabular-nums">
      {text}
    </text>
  );
}

const NODE_TONES = {
  active: "fill-card stroke-primary",
  idle: "fill-card stroke-border",
  neutral: "fill-muted stroke-border",
  critical: "fill-critical-bg stroke-critical",
} as const;

function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  tone: keyof typeof NODE_TONES;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} strokeWidth={1.5} className={NODE_TONES[tone]} />
      <text
        x={x + w / 2}
        y={y + h / 2 - 4}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-semibold"
      >
        {title}
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 11}
        textAnchor="middle"
        className={`text-[10px] ${tone === "critical" ? "fill-critical" : "fill-muted-foreground"}`}
      >
        {sub}
      </text>
    </g>
  );
}
