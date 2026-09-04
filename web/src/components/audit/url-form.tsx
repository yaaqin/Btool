"use client";

import { useState, type FormEvent } from "react";
import { SearchIcon } from "@/components/icons";

export function UrlForm({
  onSubmit,
  loading,
  placeholder,
  cta,
  ctaLoading,
}: {
  onSubmit: (url: string) => void;
  loading: boolean;
  placeholder: string;
  cta: string;
  ctaLoading: string;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const url = value.trim();
    if (!url || loading) return;
    onSubmit(url);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="url"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:ring-4 focus:ring-primary/20"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
      >
        {loading ? ctaLoading : cta}
      </button>
    </form>
  );
}
