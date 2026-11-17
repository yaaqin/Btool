import Link from "next/link";
import { descriptionPatterns, titlePatterns } from "@/content/seo-development";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";

export default async function DocPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const doc = dict.doc;
  const seoDev = doc.seoDevelopment;
  const templateNames = dict.seoDevelopmentPage;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {doc.backLink}
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {doc.pageTitle}
      </h1>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{doc.intro.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{doc.intro.body}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{doc.usage.title}</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          {doc.usage.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 font-medium text-foreground">
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{doc.userAgent.title}</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-sm font-semibold">
              {doc.userAgent.googlebot.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.userAgent.googlebot.body}
            </p>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <p className="text-sm font-semibold">
              {doc.userAgent.generic.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {doc.userAgent.generic.body}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {doc.userAgent.note}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{doc.outcomes.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {doc.outcomes.intro}
        </p>
        <dl className="mt-4 flex flex-col gap-4">
          {doc.outcomes.items.map((item) => (
            <div key={item.title} className="border-t border-border/60 pt-4">
              <dt className="text-sm font-semibold">{item.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {item.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">{doc.limits.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {doc.limits.body}
        </p>
      </section>

      <section
        id="seo-development"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold">
          <Link href="/seo-development" className="hover:underline">
            {seoDev.title}
          </Link>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{seoDev.intro}</p>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary">
          {seoDev.flowTitle}
        </h3>
        <dl className="mt-2 flex flex-col gap-4">
          {seoDev.flow.map((item) => (
            <div key={item.title} className="border-t border-border/60 pt-4">
              <dt className="text-sm font-semibold">{item.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.body}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-primary">
          {seoDev.templatesTitle}
        </h3>
        <div className="mt-3 flex flex-col gap-6">
          <PatternTable
            caption={seoDev.titleTemplatesLabel}
            columns={[seoDev.columnTemplate, seoDev.columnPattern]}
            rows={Object.entries(titlePatterns).map(([key, pattern]) => [
              templateNames.titleTemplates[key as keyof typeof titlePatterns],
              pattern,
            ])}
          />
          <PatternTable
            caption={seoDev.descriptionTemplatesLabel}
            columns={[seoDev.columnTemplate, seoDev.columnPattern]}
            rows={Object.entries(descriptionPatterns).map(([key, pattern]) => [
              templateNames.descriptionTemplates[key as keyof typeof descriptionPatterns],
              pattern,
            ])}
          />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">{seoDev.configNote}</p>
      </section>
    </div>
  );
}

function PatternTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: [string, string];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="mb-2 text-left text-sm font-semibold">{caption}</caption>
        <thead>
          <tr className="border-b border-border/60 text-xs text-muted-foreground">
            <th className="w-40 py-2 pr-4 font-semibold">{columns[0]}</th>
            <th className="py-2 font-semibold">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, pattern]) => (
            <tr key={name} className="border-b border-border/60 align-top last:border-b-0">
              <td className="py-2 pr-4 font-medium">{name}</td>
              <td className="py-2 font-mono text-xs text-muted-foreground">{pattern}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
