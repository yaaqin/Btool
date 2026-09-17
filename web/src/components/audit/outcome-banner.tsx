import type { Dictionary } from "@/i18n/dictionaries";
import type { UserAgentChoice } from "@/lib/audit";

const UA_LABEL_KEY = {
  googlebot: "userAgentGooglebot",
  generic: "userAgentGeneric",
} as const;

// Narrower than AuditResult/MetadataResult on purpose — this is the only
// slice of either result type the banner actually reads, so both fit here
// without one importing the other's type.
interface OutcomeResult {
  user_agent: UserAgentChoice;
  outcome_message?: string;
  status_code?: number;
}

export function OutcomeBanner({
  result,
  dict,
}: {
  result: OutcomeResult;
  dict: Dictionary;
}) {
  const uaLabel = dict.hero[UA_LABEL_KEY[result.user_agent]];

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning-bg p-6">
      <h2 className="text-sm font-semibold text-foreground">
        {dict.outcome.title}
      </h2>
      <p className="mt-2 text-sm text-foreground">{result.outcome_message}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        {dict.outcome.skippedNote}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {dict.outcome.checkedAs.replace("{ua}", uaLabel)}
        {result.status_code ? ` · HTTP ${result.status_code}` : ""}
      </p>
    </div>
  );
}
