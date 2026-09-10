export type Severity = "critical" | "warning" | "info";

export type Outcome =
  | "ok"
  | "blocked_by_robots"
  | "blocked_by_server"
  | "http_error"
  | "redirect_issue"
  | "timeout"
  | "dns_error";

export type UserAgentChoice = "googlebot" | "generic";

export interface Finding {
  rule_id: string;
  severity: Severity;
  title: string;
  detail: string;
  why: string;
  fix: string;
  evidence?: string;
}

export interface AuditFacts {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
}

export interface AuditSummary {
  critical: number;
  warning: number;
  info: number;
}

export interface JSONLDBlock {
  types?: string[];
  valid: boolean;
  raw?: unknown;
}

export interface NextData {
  present: boolean;
  format?: string;
}

export interface PageData {
  gtm_ids?: string[];
  ga_ids?: string[];
  data_layer?: unknown[];
  data_layer_raw?: string[];
  json_ld?: JSONLDBlock[];
  next_data?: NextData;
}

export interface AuditResult {
  url: string;
  final_url: string;
  status_code?: number;
  user_agent: UserAgentChoice;
  fetched_at: string;
  duration_ms: number;
  outcome: Outcome;
  outcome_message?: string;
  summary: AuditSummary;
  facts?: AuditFacts;
  page_data?: PageData;
  findings: Finding[];
}

// Server-only fallback (SSR/build) would be pointless here since this only
// ever runs in the browser, but the env var itself still has to carry the
// NEXT_PUBLIC_ prefix to be inlined into the client bundle.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9721";

export class AuditRequestError extends Error {
  status?: number;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    options?: { status?: number; retryAfterSeconds?: number }
  ) {
    super(message);
    this.name = "AuditRequestError";
    this.status = options?.status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

export async function runAudit(
  url: string,
  userAgent: UserAgentChoice = "googlebot"
): Promise<AuditResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/audits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, user_agent: userAgent }),
    });
  } catch {
    throw new AuditRequestError("network");
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new AuditRequestError("rate_limited", {
      status: 429,
      retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
    });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AuditRequestError(body?.error ?? "request_failed", {
      status: res.status,
    });
  }

  return res.json();
}
