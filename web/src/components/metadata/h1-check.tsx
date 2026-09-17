import { CheckCircleIcon, XCircleIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries";

export function H1Check({ h1s, dict }: { h1s: string[]; dict: Dictionary }) {
  const t = dict.metadataPage.h1;
  const ok = h1s.length === 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.title}</h2>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>

      <div className="flex items-start gap-3">
        {ok ? (
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        ) : (
          <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-critical" />
        )}
        <div className="flex flex-col gap-2">
          <p className={`text-sm font-medium ${ok ? "text-success" : "text-critical"}`}>
            {h1s.length === 0 && t.missing}
            {h1s.length === 1 && t.present}
            {h1s.length > 1 && t.duplicate.replace("{count}", String(h1s.length))}
          </p>
          {h1s.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {h1s.map((text, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-muted px-3 py-1.5 text-sm"
                >
                  {text || dict.metadataPage.table.empty}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
