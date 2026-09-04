export type Severity = "critical" | "warning" | "info";

export interface Finding {
  ruleId: string;
  severity: Severity;
  title: string;
  detail: string;
  why: string;
  fix: string;
  evidence?: string;
}

export interface AuditResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  durationMs: number;
  facts: {
    title: string;
    description: string | null;
    canonical: string | null;
    robots: string | null;
    h1Count: number;
  };
  findings: Finding[];
}

/**
 * Placeholder result used to slice the UI before the real /api/v1/audits
 * endpoint exists (see fsd.md section 10, step 4). Mirrors the example in
 * prd.md section 5 / fsd.md section 6.
 */
export function buildMockAudit(url: string): AuditResult {
  return {
    url,
    finalUrl: url,
    statusCode: 200,
    durationMs: 842,
    facts: {
      title: "AstraOtoshop",
      description: null,
      canonical: "https://example.com",
      robots: null,
      h1Count: 1,
    },
    findings: [
      {
        ruleId: "CANONICAL_MISMATCH",
        severity: "critical",
        title: "Canonical points to a different page",
        detail: `The canonical tag on this page points to https://example.com, but the page URL is ${url}.`,
        why: "Canonical tells search engines which page is the primary version. Pointing to the homepage marks this page as a duplicate, so it won't be indexed on its own.",
        fix: "Set a canonical per page. In Next.js App Router, configure metadataBase in the root layout, then a relative alternates.canonical on each page.",
        evidence: '<link rel="canonical" href="https://example.com"/>',
      },
      {
        ruleId: "DESC_MISSING",
        severity: "warning",
        title: "Meta description not found",
        detail: 'No <meta name="description"> tag on this page.',
        why: "Without a description, search engines generate their own snippet from the page content — often less compelling and inconsistent.",
        fix: 'Add <meta name="description" content="..."> with 50-160 characters summarizing the page.',
      },
      {
        ruleId: "SCHEMA_MISSING",
        severity: "info",
        title: "No structured data (JSON-LD)",
        detail: 'No <script type="application/ld+json"> block on this page.',
        why: "Structured data helps search engines show rich results (price, rating, etc).",
        fix: "Add the Product/Article schema relevant to this page type.",
      },
    ],
  };
}
