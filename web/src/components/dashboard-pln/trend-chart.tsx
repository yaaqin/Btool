"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, fmtTime } from "@/lib/dashboard-pln";

export type Series = {
  key: string;
  label: string;
  // CSS color, e.g. "var(--series-1)"
  color: string;
  values: number[];
};

type Threshold = { value: number; label: string; tone: "warning" | "critical" };

const PAD = { top: 12, right: 72, bottom: 26, left: 44 };

function niceStep(range: number, ticks: number) {
  const raw = range / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

export function TrendChart({
  title,
  times,
  series,
  unit,
  height = 220,
  domain,
  thresholds = [],
  area = false,
}: {
  title: string;
  times: number[];
  series: Series[];
  unit: string;
  height?: number;
  domain?: [number, number];
  thresholds?: Threshold[];
  // Fill under a single series (e.g. SOC).
  area?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.values);
  let [lo, hi] = domain ?? [Math.min(0, ...all), Math.max(...all)];
  const step = niceStep(hi - lo || 1, 4);
  if (!domain) {
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
  }
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (times.length > 1 ? (i / (times.length - 1)) * plotW : 0);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");

  // Direct labels at the line ends, nudged apart so they never overlap.
  const ends = series
    .map((s) => ({ s, y: y(s.values[s.values.length - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const i = Math.round((px / plotW) * (times.length - 1));
    setHover(i < 0 || i >= times.length ? null : i);
  };

  const zeroInside = lo < 0 && hi > 0;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}, ${times.length} titik data`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-none select-none"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {fmt(t, 0)}
              </text>
            </g>
          ))}
          {zeroInside && (
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(0)}
              y2={y(0)}
              className="stroke-muted-foreground/60"
              strokeWidth={1}
            />
          )}
          {thresholds.map((th) => (
            <g key={th.label}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(th.value)}
                y2={y(th.value)}
                className={th.tone === "critical" ? "stroke-critical" : "stroke-warning"}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={PAD.left + 4}
                y={y(th.value) - 4}
                className={`text-[10px] ${th.tone === "critical" ? "fill-critical" : "fill-warning"}`}
              >
                {th.label}
              </text>
            </g>
          ))}
          {times.map((t, i) =>
            // ~5 time labels whatever the sampling interval.
            i % Math.max(1, Math.round((times.length - 1) / 4)) === 0 && i < times.length - 4 ||
            i === times.length - 1 ? (
              <text
                key={t}
                x={x(i)}
                y={height - 8}
                textAnchor={i === 0 ? "start" : i === times.length - 1 ? "end" : "middle"}
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {fmtTime(t)}
              </text>
            ) : null,
          )}

          {area && series[0] && (
            <path
              d={`${path(series[0].values)}L${x(times.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`}
              fill={series[0].color}
              opacity={0.14}
            />
          )}
          {series.map((s) => (
            <path
              key={s.key}
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {ends.map(({ s, y: ly }) => (
            <g key={s.key}>
              <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={3} fill={s.color} />
              <text
                x={x(s.values.length - 1) + 8}
                y={ly}
                dy="0.32em"
                className="fill-foreground text-[10px] font-medium tabular-nums"
              >
                {series.length > 1 ? `${s.label} ` : ""}
                {fmt(s.values[s.values.length - 1], 1)}
              </text>
            </g>
          ))}

          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-muted-foreground"
                strokeWidth={1}
              />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={x(hover)}
                  cy={y(s.values[hover])}
                  r={4.5}
                  fill={s.color}
                  className="stroke-card"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
            style={
              x(hover) > width / 2
                ? { right: width - x(hover) + 12 }
                : { left: x(hover) + 12 }
            }
          >
            <p className="mb-1 font-semibold tabular-nums">{fmtTime(times[hover], true)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-medium tabular-nums">
                  {fmt(s.values[hover], 1)} {unit}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Lihat sebagai tabel
        </summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Waktu</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-1.5 font-semibold">
                    {s.label} ({unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t, i) => (
                <tr key={t} className="border-t border-border/60">
                  <td className="px-3 py-1">{fmtTime(t, true)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1">
                      {fmt(s.values[i], 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
