import { AuditRequestError, type Outcome, type UserAgentChoice } from "@/lib/audit";

export { AuditRequestError };
export type { Outcome, UserAgentChoice };

export type MetaTagIssue = "incomplete" | "invalid_json_ld";

export interface MetaTagRow {
  tag: string;
  value: string;
  issue?: MetaTagIssue;
}

// The same page after headless Chromium ran its JavaScript. "disabled"
// means the API has no render service configured.
export interface RenderedMetadata {
  status: "ok" | "disabled" | "failed";
  error?: string;
  final_url?: string;
  status_code?: number;
  duration_ms?: number;
  tags?: MetaTagRow[];
  h1s: string[];
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
  redirect_hops: string[];
  x_robots_tag: string[];
  tags?: MetaTagRow[];
  h1s: string[];
  rendered?: RenderedMetadata;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9721";

// The metadata page is password-gated (it drives a headless browser). A
// correct password buys a token valid for an hour, kept in localStorage
// so a reload doesn't ask again.
export interface MetadataSession {
  token: string;
  expiresAt: number; // epoch ms
}

const SESSION_KEY = "btool.metadataSession";

export function loadSession(): MetadataSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MetadataSession;
    if (typeof session.token !== "string" || !(session.expiresAt > Date.now())) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: MetadataSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked — the session just won't survive a reload.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function loginMetadata(password: string): Promise<MetadataSession> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/metadata/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
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
    throw new AuditRequestError("login_failed", { status: res.status });
  }

  const body: { token: string; expires_at: string } = await res.json();
  return { token: body.token, expiresAt: Date.parse(body.expires_at) };
}

export async function runMetadataReport(
  url: string,
  userAgent: UserAgentChoice,
  token: string
): Promise<MetadataResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
