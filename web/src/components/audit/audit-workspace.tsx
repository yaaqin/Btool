"use client";

import { useState } from "react";
import { UrlForm } from "@/components/audit/url-form";
import { UserAgentSelector } from "@/components/audit/user-agent-selector";
import { OutcomeBanner } from "@/components/audit/outcome-banner";
import { SummaryCards } from "@/components/audit/summary-cards";
import { FactsPanel } from "@/components/audit/facts-panel";
import { PageDataPanel } from "@/components/audit/page-data-panel";
import { FindingsList } from "@/components/audit/findings-list";
import {
  AuditRequestError,
  runAudit,
  type AuditResult,
  type UserAgentChoice,
} from "@/lib/audit";
import type { Dictionary } from "@/i18n/dictionaries";

type Status = "idle" | "loading" | "done" | "error";

function formatRetryAfter(seconds: number): string {
  const hours = Math.ceil(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}

export function AuditWorkspace({ dict }: { dict: Dictionary }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userAgent, setUserAgent] = useState<UserAgentChoice>("googlebot");

  async function handleSubmit(url: string) {
    setStatus("loading");
    setResult(null);

    try {
      const audit = await runAudit(url, userAgent);
      setResult(audit);
      setStatus("done");
    } catch (err) {
      setErrorMessage(describeError(err, dict));
      setStatus("error");
    }
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
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {dict.hero.noScoreNote}
          </p>
          <UserAgentSelector value={userAgent} onChange={setUserAgent} dict={dict} />
        </div>
      </section>

      {status === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {dict.hero.ctaLoading}
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-critical/30 bg-critical-bg p-6 text-center text-sm text-critical">
          {errorMessage}
        </div>
      )}

      {status === "done" && result && result.outcome !== "ok" && (
        <OutcomeBanner result={result} dict={dict} />
      )}

      {status === "done" && result && result.outcome === "ok" && result.facts && (
        <section className="flex flex-col gap-6">
          <SummaryCards summary={result.summary} dict={dict} />
          <FactsPanel
            facts={result.facts}
            statusCode={result.status_code}
            dict={dict}
          />
          {result.page_data && (
            <PageDataPanel pageData={result.page_data} dict={dict} />
          )}
          <FindingsList findings={result.findings} dict={dict} />
        </section>
      )}
    </div>
  );
}

function describeError(err: unknown, dict: Dictionary): string {
  if (err instanceof AuditRequestError) {
    if (err.message === "network") return dict.hero.errorNetwork;
    if (err.status === 429) {
      const time =
        err.retryAfterSeconds !== undefined
          ? formatRetryAfter(err.retryAfterSeconds)
          : "a while";
      return dict.hero.errorRateLimited.replace("{time}", time);
    }
  }
  return dict.hero.errorGeneric;
}
