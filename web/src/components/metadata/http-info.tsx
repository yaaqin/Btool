import type { Dictionary } from "@/i18n/dictionaries";
import type { MetadataResult } from "@/lib/metadata";

// What the server said before any HTML: status, redirects, and robots
// directives sent as a header — which a <meta name="robots"> check alone
// would never see.
export function HttpInfo({
  result,
  dict,
}: {
  result: MetadataResult;
  dict: Dictionary;
}) {
  const t = dict.metadataPage.http;
  const chain = [result.url, ...result.redirect_hops];
  const rendered = result.rendered?.status === "ok" ? result.rendered : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.title}</h2>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>

      <dl className="grid gap-4 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
        <dt className="text-xs font-semibold text-muted-foreground">{t.status}</dt>
        <dd className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <StatusCode code={result.status_code} />
            <span className="ml-1.5 text-xs text-muted-foreground">{t.raw}</span>
          </span>
          {rendered && (
            <span>
              <StatusCode code={rendered.status_code} />
              <span className="ml-1.5 text-xs text-muted-foreground">{t.rendered}</span>
            </span>
          )}
        </dd>

        <dt className="text-xs font-semibold text-muted-foreground">{t.redirects}</dt>
        <dd>
          {result.redirect_hops.length === 0 ? (
            <span className="text-muted-foreground">{t.noRedirects}</span>
          ) : (
            <ol className="flex flex-col gap-1">
              {chain.map((url, i) => (
                <li key={i} className="break-all">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">
                    {i === 0 ? "•" : "→"}
                  </span>
                  {url}
                </li>
              ))}
            </ol>
          )}
        </dd>

        <dt className="text-xs font-semibold text-muted-foreground">X-Robots-Tag</dt>
        <dd>
          {result.x_robots_tag.length === 0 ? (
            <span className="text-muted-foreground">{t.noXRobotsTag}</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {result.x_robots_tag.map((value, i) => (
                <li key={i}>
                  <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                    {value}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
    </div>
  );
}

function StatusCode({ code }: { code?: number }) {
  if (!code) return <span className="text-muted-foreground">-</span>;
  const tone =
    code < 300 ? "text-success" : code < 400 ? "text-warning" : "text-critical";
  return <span className={`font-mono font-semibold ${tone}`}>{code}</span>;
}
