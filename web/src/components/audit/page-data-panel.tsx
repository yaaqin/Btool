import type { Dictionary } from "@/i18n/dictionaries";
import type { PageData } from "@/lib/audit";

function Chips({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <code
            key={v}
            className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs"
          >
            {v}
          </code>
        ))}
      </div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function PageDataPanel({
  pageData,
  dict,
}: {
  pageData: PageData;
  dict: Dictionary;
}) {
  const gtm = pageData.gtm_ids ?? [];
  const ga = pageData.ga_ids ?? [];
  const dataLayer = pageData.data_layer ?? [];
  const dataLayerRaw = pageData.data_layer_raw ?? [];
  const jsonLd = pageData.json_ld ?? [];
  const nextData = pageData.next_data;

  const hasAny =
    gtm.length > 0 ||
    ga.length > 0 ||
    dataLayer.length > 0 ||
    dataLayerRaw.length > 0 ||
    jsonLd.length > 0 ||
    nextData?.present;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{dict.pageData.title}</h2>
        <p className="text-xs text-muted-foreground">{dict.pageData.hint}</p>
      </div>

      {!hasAny && (
        <p className="text-sm text-muted-foreground">{dict.pageData.empty}</p>
      )}

      <div className="flex flex-col gap-5">
        {gtm.length > 0 && <Chips label={dict.pageData.gtm} values={gtm} />}
        {ga.length > 0 && <Chips label={dict.pageData.ga} values={ga} />}

        {nextData?.present && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {dict.pageData.nextData}
            </span>
            <span className="text-sm font-medium">
              {dict.pageData.nextDataPresent.replace(
                "{format}",
                nextData.format ?? ""
              )}
            </span>
          </div>
        )}

        {(dataLayer.length > 0 || dataLayerRaw.length > 0) && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {dict.pageData.dataLayer}
            </span>
            {dataLayer.map((entry, i) => (
              <JsonBlock key={`dl-${i}`} value={entry} />
            ))}
            {dataLayerRaw.length > 0 && (
              <>
                <span className="mt-1 text-xs text-muted-foreground">
                  {dict.pageData.dataLayerRawNote}
                </span>
                {dataLayerRaw.map((raw, i) => (
                  <code
                    key={`dlr-${i}`}
                    className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs"
                  >
                    {raw}
                  </code>
                ))}
              </>
            )}
          </div>
        )}

        {jsonLd.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              {dict.pageData.jsonLd}
            </span>
            {jsonLd.map((block, i) => (
              <details
                key={`ld-${i}`}
                className="group rounded-lg border border-border/60"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {block.types?.join(", ") || "—"}
                  </span>
                  {!block.valid && (
                    <span className="rounded-full border border-warning/30 bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
                      {dict.pageData.jsonLdInvalid}
                    </span>
                  )}
                </summary>
                {block.valid && block.raw !== undefined && (
                  <div className="px-3 pb-3">
                    <JsonBlock value={block.raw} />
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
