"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  AuditRequestError,
  loginMetadata,
  type MetadataSession,
} from "@/lib/metadata";

export function PasswordGate({
  onUnlock,
  notice,
  dict,
}: {
  onUnlock: (session: MetadataSession) => void;
  // Shown above the form, e.g. "your session expired".
  notice?: string;
  dict: Dictionary;
}) {
  const t = dict.metadataPage.gate;
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      onUnlock(await loginMetadata(password));
    } catch (err) {
      setError(describeLoginError(err, dict));
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold">{t.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
      {notice && !error && (
        <p className="mt-4 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">
          {notice}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          className="w-full flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {loading ? t.ctaLoading : t.cta}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-critical">{error}</p>}
    </div>
  );
}

function describeLoginError(err: unknown, dict: Dictionary): string {
  const t = dict.metadataPage.gate;
  if (err instanceof AuditRequestError) {
    if (err.message === "network") return dict.hero.errorNetwork;
    if (err.status === 401) return t.wrongPassword;
    if (err.status === 429) return t.tooManyAttempts;
    if (err.status === 503) return t.notConfigured;
  }
  return dict.hero.errorGeneric;
}
