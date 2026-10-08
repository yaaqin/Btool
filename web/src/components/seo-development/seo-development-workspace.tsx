"use client";

import { useState, type ReactNode } from "react";
import {
  examplePaths,
  initialPath,
  initialResponse,
  sortOptions,
} from "@/content/seo-development";
import {
  getPage,
  getQueryParam,
  resolveExpected,
  setQueryParam,
  validatePath,
  type IndexStatus,
  type Note,
  type Thresholds,
} from "@/lib/seo-development";
import type { Dictionary } from "@/i18n/dictionaries";

// Inputs are kept as strings so a field can be cleared while typing
// without snapping back to 0.
type ResponseDraft = {
  totalProducts: string;
  outOfStock: string;
  minPrice: string;
  topBrands: string;
};

const INITIAL_DRAFT: ResponseDraft = {
  totalProducts: String(initialResponse.totalProducts),
  outOfStock: String(initialResponse.outOfStock),
  minPrice: String(initialResponse.minPrice),
  topBrands: initialResponse.topBrands,
};

function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

function toCount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function SeoDevelopmentWorkspace({
  thresholds,
  dict,
}: {
  thresholds: Thresholds;
  dict: Dictionary;
}) {
  const t = dict.seoDevelopmentPage;
  const [draft, setDraft] = useState<ResponseDraft>(INITIAL_DRAFT);
  const [path, setPath] = useState(initialPath);
  // What's typed in the page field while it has focus. The page itself
  // lives in the path, so without this the field can't be cleared: an
  // empty value means page 1 and would snap straight back to "1".
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const response = {
    totalProducts: toCount(draft.totalProducts),
    outOfStock: toCount(draft.outOfStock),
    minPrice: toCount(draft.minPrice),
    topBrands: draft.topBrands,
  };
  const pathError = validatePath(path);
  const stockError =
    response.outOfStock > response.totalProducts
      ? t.response.stockError
      : null;
  const inStock = Math.max(0, response.totalProducts - response.outOfStock);
  const stockPercent =
    response.totalProducts > 0 ? Math.round((inStock / response.totalProducts) * 100) : 0;

  const page = getPage(path);
  const sort = getQueryParam(path, "sort");

  const expected =
    pathError || stockError ? null : resolveExpected(path, response, thresholds);

  function update(field: keyof ResponseDraft, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function handlePageChange(value: string) {
    setPageDraft(value);
    const n = Number(value);
    setPath((p) => setQueryParam(p, "page", Number.isInteger(n) && n > 1 ? String(n) : null));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (permissions / insecure context): nothing to do.
    }
  }

  function handleSortToggle(value: string) {
    setPath((p) => setQueryParam(p, "sort", sort === value ? null : value));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.hero.title}</h1>
        <p className="max-w-3xl text-muted-foreground sm:text-lg">{t.hero.description}</p>
      </header>

      <div className="flex flex-col gap-6">
        <Panel step={1} title={t.path.title}>
          <div className="flex gap-2">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value.trim())}
              placeholder="/products/aki"
              spellCheck={false}
              aria-invalid={Boolean(pathError)}
              className={`${INPUT_CLASS} font-mono ${pathError ? "border-critical" : ""}`}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? t.path.copied : t.path.copy}
            </button>
          </div>
          {pathError && <p className="mt-2 text-xs text-critical">{t.path.errors[pathError]}</p>}
          <p className="mt-4 text-xs font-semibold text-muted-foreground">{t.path.examples}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {examplePaths.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPath(p)}
                className={`rounded-md border px-2 py-1 text-left font-mono text-[11px] transition-colors ${
                  p === path
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          step={2}
          title={t.response.title}
          action={
            <button
              type="button"
              onClick={() => setDraft(INITIAL_DRAFT)}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {t.response.reset}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField
              label="totalProducts"
              value={draft.totalProducts}
              onChange={(v) => update("totalProducts", v)}
            />
            <NumberField
              label="outOfStock"
              value={draft.outOfStock}
              onChange={(v) => update("outOfStock", v)}
            />
            <NumberField
              label="page"
              hint={t.response.pageHint}
              value={pageDraft ?? String(page)}
              min={1}
              onChange={handlePageChange}
              onBlur={() => setPageDraft(null)}
            />
            <NumberField
              label="minPrice"
              value={draft.minPrice}
              onChange={(v) => update("minPrice", v)}
            />
            <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-4">
              <span className="font-mono text-xs text-muted-foreground">topBrands</span>
              <input
                type="text"
                value={draft.topBrands}
                onChange={(e) => update("topBrands", e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <p className={`mt-3 text-xs ${stockError ? "text-critical" : "text-muted-foreground"}`}>
            {stockError ??
              fill(t.response.inStock, {
                inStock,
                total: response.totalProducts,
                percent: stockPercent,
              })}
          </p>

          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold">
              {t.response.sortTitle}{" "}
              <span className="font-normal text-muted-foreground">· {t.response.sortHint}</span>
            </p>
            <ul className="mt-2 flex flex-col">
              {sortOptions.map((opt) => {
                const checked = sort === opt.value;
                return (
                  <li key={opt.value}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleSortToggle(opt.value)}
                        disabled={Boolean(pathError)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className={checked ? "font-semibold text-primary" : ""}>{opt.label}</span>
                      <code className="ml-auto font-mono text-xs text-muted-foreground">{opt.value}</code>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel step={3} title={t.expected.title}>
        {!expected ? (
          <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
            {t.expected.empty}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {fill(t.kinds[expected.kind], { level: expected.level })}
              </span>
              <span className="break-all font-mono text-muted-foreground">{path}</span>
            </div>

            <Field
              label={t.expected.metaTitle}
              meta={
                <LengthBadge
                  length={expected.title.length}
                  max={expected.titleLimitApplies ? thresholds.titleMaxLength : null}
                />
              }
            >
              <p className="text-base font-medium">{expected.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fill(t.expected.template, { name: t.titleTemplates[expected.titleTemplate] })}
                {!expected.titleLimitApplies && ` · ${t.expected.noLengthLimit}`}
                {expected.droppedWords.length > 0 &&
                  ` · ${fill(t.expected.dropped, { words: expected.droppedWords.join(", ") })}`}
              </p>
            </Field>

            <Field
              label={t.expected.metaDescription}
              meta={<LengthBadge length={expected.description.length} max={null} />}
            >
              <p className="text-sm">{expected.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {fill(t.expected.template, {
                  name: t.descriptionTemplates[expected.descriptionTemplate],
                })}
              </p>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t.expected.robots}>
                <div className="flex items-center gap-2">
                  <IndexBadge status={expected.index} />
                  <Badge tone="success">{expected.follow}</Badge>
                </div>
                <code className="mt-2 block font-mono text-xs text-muted-foreground">
                  {expected.index === "-"
                    ? t.expected.robotsUnset
                    : `<meta name="robots" content="${expected.index}, ${expected.follow}">`}
                </code>
              </Field>

              <Field label={t.expected.internalLink}>
                <Badge tone={expected.internalLink ? "success" : "muted"}>
                  {expected.internalLink ? "true" : "false"}
                </Badge>
              </Field>
            </div>

            <Field label={t.expected.canonical}>
              <div className="flex flex-wrap items-center gap-2">
                {expected.canonicalIsSelf && <Badge tone="success">self</Badge>}
                <code className="break-all font-mono text-sm">{expected.canonical}</code>
              </div>
            </Field>

            {expected.notes.length > 0 && (
              <Field label={t.expected.notes}>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
                  {expected.notes.map((note, i) => (
                    <li key={i}>{noteText(note, t.notes)}</li>
                  ))}
                </ul>
              </Field>
            )}

            <p className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
              {fill(t.expected.rules, {
                minProducts: thresholds.minProducts,
                minStock: thresholds.minInStockPercent,
                maxTitle: thresholds.titleMaxLength,
              })}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

function noteText(note: Note, notes: Dictionary["seoDevelopmentPage"]["notes"]): string {
  return fill(notes[note.key], note.params);
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-primary/20";

function Panel({
  step,
  title,
  action,
  children,
}: {
  step: number;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  hint,
  value,
  min = 0,
  onChange,
  onBlur,
}: {
  label: string;
  hint?: string;
  value: string;
  min?: number;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        // A focused number input changes its value on mouse wheel; drop
        // focus instead so scrolling the page never edits the field.
        onWheel={(e) => e.currentTarget.blur()}
        className={`${INPUT_CLASS} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Field({ label, meta, children }: { label: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {meta}
      </div>
      {children}
    </div>
  );
}

const BADGE_TONES = {
  success: "bg-success-bg text-success",
  critical: "bg-critical-bg text-critical",
  muted: "bg-muted text-muted-foreground",
} as const;

function Badge({ tone, children }: { tone: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

function IndexBadge({ status }: { status: IndexStatus }) {
  const tone = status === "index" ? "success" : status === "noindex" ? "critical" : "muted";
  return <Badge tone={tone}>{status}</Badge>;
}

function LengthBadge({ length, max }: { length: number; max: number | null }) {
  const over = max !== null && length > max;
  return (
    <span className={`font-mono text-xs ${over ? "text-critical" : "text-muted-foreground"}`}>
      {length}
      {max !== null && ` / ${max}`}
    </span>
  );
}
