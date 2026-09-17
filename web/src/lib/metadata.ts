import { AuditRequestError, type Outcome, type UserAgentChoice } from "@/lib/audit";

export { AuditRequestError };
export type { Outcome, UserAgentChoice };

export interface MetaTagRow {
  tag: string;
  value: string;
}

export interface MetadataResult {
  url: string;
  final_url: string;
  status_code?: number;
  user_agent: UserAgentChoice;
  fetched_at: string;
  duration_ms: number;
  outcome: Outcome;
  outcome_message?: string;
  tags?: MetaTagRow[];
  h1s: string[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9721";

export async function runMetadataReport(
  url: string,
  userAgent: UserAgentChoice = "googlebot"
): Promise<MetadataResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/metadata`, {
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
