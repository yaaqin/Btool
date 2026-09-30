"use client";

import { useCallback, useEffect, useState } from "react";
import { UrlForm } from "@/components/audit/url-form";
import { UserAgentSelector } from "@/components/audit/user-agent-selector";
import { OutcomeBanner } from "@/components/audit/outcome-banner";
import { MetadataTable } from "@/components/metadata/metadata-table";
import { H1Check } from "@/components/metadata/h1-check";
import { HttpInfo } from "@/components/metadata/http-info";
import { PasswordGate } from "@/components/metadata/password-gate";
import {
  AuditRequestError,
  clearSession,
  loadSession,
  runMetadataReport,
  saveSession,
  type MetadataResult,
  type MetadataSession,
  type UserAgentChoice,
} from "@/lib/metadata";
import type { Dictionary } from "@/i18n/dictionaries";

type Status = "idle" | "loading" | "done" | "error";

function formatRetryAfter(seconds: number): string {
  const hours = Math.ceil(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}

export function MetadataWorkspace({ dict }: { dict: Dictionary }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<MetadataResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userAgent, setUserAgent] = useState<UserAgentChoice>("googlebot");
  // undefined until localStorage has been read on the client, so the
  // server render and first client render agree (and nothing flashes).
  const [session, setSession] = useState<MetadataSession | null | undefined>(undefined);
  const [gateNotice, setGateNotice] = useState("");

  const lock = useCallback((notice = "") => {
    clearSession();
    setSession(null);
    setGateNotice(notice);
    setStatus("idle");
    setResult(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage has to wait for the client
    setSession(loadSession());
  }, []);

  // Lock again the moment the hour is up, even if the tab is left open.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      () => lock(dict.metadataPage.gate.expired),
      session.expiresAt - Date.now()
    );
    return () => clearTimeout(timer);
  }, [session, lock, dict]);

  function handleUnlock(next: MetadataSession) {
    saveSession(next);
    setSession(next);
    setGateNotice("");
  }

  async function handleSubmit(url: string) {
    if (!session) return;
    setStatus("loading");
    setResult(null);

    try {
      const report = await runMetadataReport(url, userAgent, session.token);
      setResult(report);
      setStatus("done");
    } catch (err) {
      // The API is the source of truth (e.g. it restarted and forgot the
      // token) — a 401 means back to the password form.
      if (err instanceof AuditRequestError && err.status === 401) {
        lock(dict.metadataPage.gate.expired);
        return;
      }
      setErrorMessage(describeError(err, dict));
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="flex flex-col gap-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.metadataPage.hero.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground sm:text-lg">
          {dict.metadataPage.hero.description}
        </p>
        {session === null && (
          <PasswordGate onUnlock={handleUnlock} notice={gateNotice} dict={dict} />
        )}
        {session && (
          <>
            <UrlForm
              onSubmit={handleSubmit}
              loading={status === "loading"}
              placeholder={dict.hero.placeholder}
              cta={dict.hero.cta}
              ctaLoading={dict.hero.ctaLoading}
            />
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {dict.metadataPage.gate.unlockedUntil.replace(
                  "{time}",
                  new Date(session.expiresAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                )}
                {" · "}
                <button
                  type="button"
                  onClick={() => lock()}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {dict.metadataPage.gate.lock}
                </button>
              </p>
              <UserAgentSelector value={userAgent} onChange={setUserAgent} dict={dict} />
            </div>
          </>
        )}
      </section>

      {status === "loading" && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {dict.metadataPage.loading}
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

      {status === "done" && result && result.outcome === "ok" && (
        <MetadataReport result={result} dict={dict} />
      )}
    </div>
  );
}

function MetadataReport({
  result,
  dict,
}: {
  result: MetadataResult;
  dict: Dictionary;
}) {
  const t = dict.metadataPage;
  const rendered = result.rendered;
  const renderedOk = rendered?.status === "ok" ? rendered : null;

  return (
    <section className="flex flex-col gap-6">
      <HttpInfo result={result} dict={dict} />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{t.table.title}</h2>
          <p className="text-xs text-muted-foreground">
            {renderedOk ? t.table.hintCompared : t.table.hint}
          </p>
        </div>
        {rendered && rendered.status !== "ok" && (
          <p className="mb-4 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
            {rendered.status === "disabled"
              ? t.table.renderDisabled
              : t.table.renderFailed.replace("{error}", rendered.error ?? "")}
          </p>
        )}
        <MetadataTable
          tags={result.tags ?? []}
          renderedTags={renderedOk ? (renderedOk.tags ?? []) : undefined}
          dict={dict}
        />
      </div>

      {renderedOk ? (
        <div className="grid gap-6 md:grid-cols-2">
          <H1Check h1s={result.h1s} source={t.table.columnRaw} dict={dict} />
          <H1Check h1s={renderedOk.h1s} source={t.table.columnRendered} dict={dict} />
        </div>
      ) : (
        <H1Check h1s={result.h1s} dict={dict} />
      )}
    </section>
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
