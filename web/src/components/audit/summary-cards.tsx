import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AuditResult, Severity } from "@/lib/mock-audit";

const TONE_CLASSES: Record<Severity, string> = {
  critical: "bg-critical-bg text-critical",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
};

export function SummaryCards({
  result,
  dict,
}: {
  result: AuditResult;
  dict: Dictionary;
}) {
  const counts: Record<Severity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };
  for (const finding of result.findings) counts[finding.severity]++;

  const cards: Array<{
    severity: Severity;
    label: string;
    icon: typeof AlertOctagonIcon;
  }> = [
    { severity: "critical", label: dict.summary.critical, icon: AlertOctagonIcon },
    { severity: "warning", label: dict.summary.warning, icon: AlertTriangleIcon },
    { severity: "info", label: dict.summary.info, icon: InfoIcon },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{dict.summary.title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ severity, label, icon: Icon }) => (
          <div
            key={severity}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[severity]}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-tight">
                {counts[severity]}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
