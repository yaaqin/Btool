"use client";

import { useState } from "react";
import { UrlForm } from "@/components/audit/url-form";
import { SummaryCards } from "@/components/audit/summary-cards";
import { FactsPanel } from "@/components/audit/facts-panel";
import { FindingsList } from "@/components/audit/findings-list";
import { buildMockAudit, type AuditResult } from "@/lib/mock-audit";
import type { Dictionary } from "@/i18n/dictionaries";

type Status = "idle" | "loading" | "done";

export function AuditWorkspace({ dict }: { dict: Dictionary }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AuditResult | null>(null);

  function handleSubmit(url: string) {
    setStatus("loading");
    setResult(null);
    // Placeholder delay until the real /api/v1/audits endpoint exists.
    window.setTimeout(() => {
      setResult(buildMockAudit(url));
      setStatus("done");
    }, 900);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="flex flex-col gap-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.hero.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground sm:text-lg">
          {dict.hero.description}
        </p>
        <UrlForm
          onSubmit={handleSubmit}
          loading={status === "loading"}
          placeholder={dict.hero.placeholder}
          cta={dict.hero.cta}
          ctaLoading={dict.hero.ctaLoading}
        />
        <p className="text-xs text-muted-foreground">{dict.hero.noScoreNote}</p>
      </section>

      {status === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {dict.hero.ctaLoading}
        </div>
      )}

      {status === "done" && result && (
        <section className="flex flex-col gap-6">
          <SummaryCards result={result} dict={dict} />
          <FactsPanel result={result} dict={dict} />
          <FindingsList findings={result.findings} dict={dict} />
        </section>
      )}
    </div>
  );
}
