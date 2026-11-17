// Parsing + derived values + alert evaluation for the PLN hybrid PLTD
// dashboard. Input is Wiraky's positional JSON payload
// ({"id":"<type>.<slave>","data":[ts, ...]}), see
// src/data/dashboard-pln/catalog.json for the field map.

import alertRulesJson from "@/data/dashboard-pln/alert-rules.json";

export type Payload = { id: string; data: (number | string)[] };

export type RawSite = {
  id: string;
  name: string;
  location: { province: string; regency: string; lat: number; lng: number };
  system: {
    inverterCount: number;
    inverterRatedKw: number;
    batteryKwh: number;
    batteryNominalV: number;
    dgRatedKva: number;
    dgRatedKw: number;
    dgTankCapacityL: number;
    transformer: string;
    busVoltageLL: number;
  };
  lastSeen: number;
  payloads: Payload[];
  proposed: {
    io?: Payload;
    frequencyHz?: number;
    powerFactor?: number;
    batteryTempC?: number;
    cellVmin?: number;
    cellVmax?: number;
    dgRunHours?: number;
    dgCoolantC?: number;
    ambientC?: number;
    humidityPct?: number;
  };
};

export type HistoryPoint = { t: number; load: number; dg: number; bess: number; soc: number };

export type Severity = "critical" | "warning";
export type SiteStatus = "normal" | "warning" | "critical" | "offline";

type Threshold = number | string | number[];
export type AlertRule = {
  id: string;
  title: string;
  metric: string;
  unit: string;
  condition: "below" | "above" | "outside" | "equals";
  warning?: Threshold;
  critical?: Threshold;
  source: "wiraky" | "usulan";
  why: string;
  action: string;
};

export const ALERT_RULES = alertRulesJson.rules as AlertRule[];

// Assumed when the payload carries no power factor (Wiraky's current
// format doesn't) — every kW figure derived from V × A depends on it.
export const DEFAULT_PF = 0.9;
export const OFFLINE_AFTER_MIN = 15;

export const DEVICE_TYPES: Record<string, string> = {
  "1": "kWh Meter 1 · DG",
  "2": "kWh Meter 2 · Inverter",
  "3": "kWh Meter 3 · Beban",
  "4": "Inverter",
  "5": "Diesel Generator",
  "6": "IO Dry Contact",
};

export type Meter = {
  id: string;
  label: string;
  ts: number;
  v: number[];
  a: number[];
  kw: number;
  unbalancePct: number;
};

export type Inverter = {
  id: string;
  ts: number;
  v: number[];
  a: number[];
  kw: number; // + discharge, − charge
  loadingPct: number;
  soc: number;
  state: string;
  vb: number;
  ab: number;
  soh: number;
};

export type Site = {
  raw: RawSite;
  id: string;
  name: string;
  dataAgeMin: number;
  meters: { dg?: Meter; inverter?: Meter; load?: Meter };
  inverters: Inverter[];
  battery: {
    soc: number;
    soh: number;
    voltage: number;
    currentA: number; // + discharge, − charge
    state: string;
    kw: number;
    energyKwh: number;
    autonomyH: number | null;
    tempC?: number;
    cellVmin?: number;
    cellVmax?: number;
  };
  dg: {
    status: string;
    fuelL: number;
    fuelPct: number;
    kw: number;
    loadingPct: number;
    runHours?: number;
    coolantC?: number;
  };
  loadKw: number;
  pf: number;
  pfAssumed: boolean;
  frequencyHz?: number;
  io: { door: "OPEN" | "CLOSED" | null; dgRun: boolean | null };
  env: { ambientC?: number; humidityPct?: number };
};

export type Alert = {
  rule: AlertRule;
  severity: Severity;
  source: string;
  value: number | string;
};

const num = (x: number | string | undefined) => (typeof x === "number" ? x : Number(x ?? 0));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function phaseKw(v: number[], a: number[], pf: number) {
  return sum(v.map((vi, i) => (vi * a[i] * pf) / 1000));
}

export function currentUnbalance(a: number[]) {
  const avg = sum(a) / a.length;
  if (avg < 1) return 0; // ignore near-idle readings
  return (Math.max(...a.map((x) => Math.abs(x - avg))) / avg) * 100;
}

export function parseSite(raw: RawSite, now: number): Site {
  const pfAssumed = raw.proposed.powerFactor === undefined;
  const pf = raw.proposed.powerFactor ?? DEFAULT_PF;
  const byType = (t: string) => raw.payloads.filter((p) => p.id.split(".")[0] === t);

  const parseMeter = (p: Payload | undefined): Meter | undefined => {
    if (!p) return undefined;
    const d = p.data.map(num);
    const v = d.slice(1, 4);
    const a = d.slice(4, 7);
    return {
      id: p.id,
      label: DEVICE_TYPES[p.id.split(".")[0]],
      ts: d[0],
      v,
      a,
      kw: phaseKw(v, a, pf),
      unbalancePct: currentUnbalance(a),
    };
  };

  const inverters: Inverter[] = byType("4").map((p) => {
    const d = p.data;
    const v = d.slice(1, 4).map(num);
    const a = d.slice(4, 7).map(num);
    const state = String(d[8]);
    const magnitude = phaseKw(v, a, pf);
    const kw = state === "CHARGE" ? -magnitude : state === "DISCHARGE" ? magnitude : 0;
    return {
      id: p.id,
      ts: num(d[0]),
      v,
      a,
      kw,
      loadingPct: (magnitude / raw.system.inverterRatedKw) * 100,
      soc: num(d[7]),
      state,
      vb: num(d[9]),
      ab: num(d[10]),
      soh: num(d[11]),
    };
  });

  const meters = {
    dg: parseMeter(byType("1")[0]),
    inverter: parseMeter(byType("2")[0]),
    load: parseMeter(byType("3")[0]),
  };

  // Battery: all inverters share one bank, so take SOC/SOH/VB from the
  // first and sum currents.
  const master = inverters[0];
  const batteryKw = sum(inverters.map((i) => i.kw));
  const totalAb = sum(inverters.map((i) => i.ab));
  const usableKwh = (raw.system.batteryKwh * (master?.soh ?? 100)) / 100;
  const energyKwh = (usableKwh * (master?.soc ?? 0)) / 100;
  const loadKw = meters.load?.kw ?? 0;
  const reserveKwh = (Math.max(0, (master?.soc ?? 0) - 10) / 100) * usableKwh;

  const dgPayload = byType("5")[0];
  const fuelL = num(dgPayload?.data[1]);
  const dgKw = meters.dg?.kw ?? 0;

  const ioData = raw.proposed.io?.data;

  return {
    raw,
    id: raw.id,
    name: raw.name,
    dataAgeMin: Math.max(0, (now - raw.lastSeen) / 60),
    meters,
    inverters,
    battery: {
      soc: master?.soc ?? 0,
      soh: master?.soh ?? 0,
      voltage: master?.vb ?? 0,
      currentA: batteryKw >= 0 ? totalAb : -totalAb,
      state: master?.state ?? "—",
      kw: batteryKw,
      energyKwh,
      autonomyH: loadKw > 0.5 ? reserveKwh / loadKw : null,
      tempC: raw.proposed.batteryTempC,
      cellVmin: raw.proposed.cellVmin,
      cellVmax: raw.proposed.cellVmax,
    },
    dg: {
      status: dgPayload ? String(dgPayload.data[2]) : "—",
      fuelL,
      fuelPct: (fuelL / raw.system.dgTankCapacityL) * 100,
      kw: dgKw,
      loadingPct: (dgKw / raw.system.dgRatedKw) * 100,
      runHours: raw.proposed.dgRunHours,
      coolantC: raw.proposed.dgCoolantC,
    },
    loadKw,
    pf,
    pfAssumed,
    frequencyHz: raw.proposed.frequencyHz,
    io: {
      door: ioData ? (num(ioData[1]) === 1 ? "OPEN" : "CLOSED") : null,
      dgRun: ioData ? num(ioData[2]) === 1 : null,
    },
    env: { ambientC: raw.proposed.ambientC, humidityPct: raw.proposed.humidityPct },
  };
}

// Every value a rule's metric resolves to, with where it came from. A
// metric can fan out (one value per phase per meter); a missing optional
// field resolves to nothing, so its rule simply doesn't fire.
function metricValues(site: Site, metric: string): { source: string; value: number | string }[] {
  const meters = Object.values(site.meters).filter((m): m is Meter => !!m);
  const opt = (source: string, value: number | undefined) =>
    value === undefined ? [] : [{ source, value }];
  switch (metric) {
    case "site.dataAgeMin":
      return [{ source: "Gateway", value: site.dataAgeMin }];
    case "dg.status":
      return [{ source: "DG 5.1", value: site.dg.status }];
    case "dg.notStartedLowSoc":
      return [
        {
          source: "DG 5.1 + Inverter",
          value: site.battery.soc < 20 && site.dg.status === "STOP" ? "YES" : "NO",
        },
      ];
    case "dg.fuelPct":
      return [{ source: "DG 5.1", value: site.dg.fuelPct }];
    case "dg.coolantC":
      return opt("DG 5.1", site.dg.coolantC);
    case "battery.soc":
      return [{ source: "Inverter 4.1", value: site.battery.soc }];
    case "battery.soh":
      return [{ source: "Inverter 4.1", value: site.battery.soh }];
    case "battery.voltage":
      return [{ source: "Inverter 4.1", value: site.battery.voltage }];
    case "battery.tempC":
      return opt("BMS", site.battery.tempC);
    case "meter.phaseVoltage":
      return meters.flatMap((m) =>
        m.v.map((value, i) => ({ source: `${m.id} fasa ${"RST"[i]}`, value })),
      );
    case "meter.currentUnbalance":
      return meters.map((m) => ({ source: `Meter ${m.id}`, value: m.unbalancePct }));
    case "inverter.loadingPct":
      return site.inverters.map((inv) => ({ source: `Inverter ${inv.id}`, value: inv.loadingPct }));
    case "grid.frequencyHz":
      return opt("Meter 3.1", site.frequencyHz);
    case "io.door":
      return site.io.door ? [{ source: "IO 6.1", value: site.io.door }] : [];
    default:
      return [];
  }
}

function breaches(rule: AlertRule, t: Threshold | undefined, value: number | string) {
  if (t === undefined) return false;
  switch (rule.condition) {
    case "below":
      return typeof value === "number" && value < (t as number);
    case "above":
      return typeof value === "number" && value > (t as number);
    case "outside": {
      const [lo, hi] = t as number[];
      return typeof value === "number" && (value < lo || value > hi);
    }
    case "equals":
      return value === t;
  }
}

export function evaluateAlerts(site: Site, rules: AlertRule[] = ALERT_RULES): Alert[] {
  const alerts: Alert[] = [];
  for (const rule of rules) {
    for (const { source, value } of metricValues(site, rule.metric)) {
      const severity: Severity | null = breaches(rule, rule.critical, value)
        ? "critical"
        : breaches(rule, rule.warning, value)
          ? "warning"
          : null;
      if (severity) alerts.push({ rule, severity, source, value });
    }
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}

export function siteStatus(site: Site, alerts: Alert[]): SiteStatus {
  if (site.dataAgeMin > OFFLINE_AFTER_MIN) return "offline";
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.length) return "warning";
  return "normal";
}

export function powerSource(site: Site) {
  const dgOn = site.dg.status === "RUN" && site.dg.kw > 0.5;
  const battOn = site.battery.kw > 0.3;
  if (dgOn && battOn) return "DG + Baterai";
  if (dgOn) return site.battery.kw < -0.3 ? "DG (sambil mengisi baterai)" : "DG";
  if (battOn) return "Baterai";
  return "Tidak ada";
}

export function formatThreshold(rule: AlertRule, t: Threshold | undefined) {
  if (t === undefined) return "—";
  const u = rule.unit ? ` ${rule.unit}` : "";
  switch (rule.condition) {
    case "below":
      return `< ${t}${u}`;
    case "above":
      return `> ${t}${u}`;
    case "outside": {
      const [lo, hi] = t as number[];
      return `di luar ${lo}–${hi}${u}`;
    }
    case "equals":
      return `= ${t}`;
  }
}

export function formatValue(value: number | string, unit: string) {
  if (typeof value === "string") return value;
  return `${fmt(value, 1)}${unit ? ` ${unit}` : ""}`;
}

export function fmt(n: number, digits = 1) {
  return n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtTime(unix: number, withDate = false) {
  return new Date(unix * 1000).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    ...(withDate ? { day: "numeric", month: "short", year: "numeric" } : {}),
  });
}
