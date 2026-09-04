import type { Dictionary } from "@/i18n/dictionaries";
import type { AuditResult } from "@/lib/audit";

export function FactsPanel({
  result,
  dict,
}: {
  result: AuditResult;
  dict: Dictionary;
}) {
  const rows: Array<{ label: string; value: string | undefined }> = [
    { label: dict.facts.fields.title, value: result.facts.title },
    { label: dict.facts.fields.description, value: result.facts.description },
    { label: dict.facts.fields.canonical, value: result.facts.canonical },
    { label: dict.facts.fields.robots, value: result.facts.robots },
    { label: dict.facts.fields.statusCode, value: String(result.status_code) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{dict.facts.title}</h2>
        <p className="text-xs text-muted-foreground">
          {dict.facts.descriptionHint}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className="max-w-[60%] truncate text-right font-medium"
              title={row.value ?? undefined}
            >
              {row.value || dict.facts.empty}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
