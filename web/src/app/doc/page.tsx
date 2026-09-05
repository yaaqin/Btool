import Link from "next/link";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";

export default async function DocPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const doc = dict.doc;

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
    </div>
  );
}
