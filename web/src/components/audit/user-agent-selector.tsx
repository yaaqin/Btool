"use client";

import type { Dictionary } from "@/i18n/dictionaries";
import type { UserAgentChoice } from "@/lib/audit";

const OPTIONS: UserAgentChoice[] = ["googlebot", "generic"];

export function UserAgentSelector({
  value,
  onChange,
  dict,
}: {
  value: UserAgentChoice;
  onChange: (next: UserAgentChoice) => void;
  dict: Dictionary;
}) {
  const labels: Record<UserAgentChoice, string> = {
    googlebot: dict.hero.userAgentGooglebot,
    generic: dict.hero.userAgentGeneric,
  };

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const next = e.currentTarget.dataset.ua as UserAgentChoice | undefined;
    if (next) onChange(next);
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{dict.hero.userAgentLabel}</span>
      <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 font-medium">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            data-ua={option}
            onClick={handleClick}
            aria-pressed={value === option}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              value === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
