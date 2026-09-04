import { ChevronDownIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Finding, Severity } from "@/lib/audit";

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "info"];

const BADGE_CLASSES: Record<Severity, string> = {
  critical: "border-critical/30 bg-critical-bg text-critical",
  warning: "border-warning/30 bg-warning-bg text-warning",
  info: "border-info/30 bg-info-bg text-info",
};

export function FindingsList({
  findings,
  dict,
}: {
  findings: Finding[];
  dict: Dictionary;
}) {
  const sorted = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{dict.findings.title}</h2>
      {sorted.map((finding) => (
        <details
          key={finding.rule_id}
          className="group rounded-2xl border border-border bg-card p-5 shadow-sm open:shadow-md"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${BADGE_CLASSES[finding.severity]}`}
              >
                {dict.summary[finding.severity]}
              </span>
              <span className="font-medium">{finding.title}</span>
            </div>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground">
            <p>{finding.detail}</p>
            <div>
              <p className="font-medium text-foreground">{dict.findings.why}</p>
              <p>{finding.why}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{dict.findings.fix}</p>
              <p>{finding.fix}</p>
            </div>
            {finding.evidence && (
              <div>
                <p className="font-medium text-foreground">
                  {dict.findings.evidence}
                </p>
                <code className="mt-1 block overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">
                  {finding.evidence}
                </code>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
