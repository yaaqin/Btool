package rules

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/yaaqin/builder-tool/internal/parser"
)

type TitleRule struct{}

func (TitleRule) ID() string { return "title" }

func (TitleRule) Check(f *parser.PageFacts) []Finding {
	title := strings.TrimSpace(f.Title)
	if title == "" {
		return []Finding{{
			RuleID:   "TITLE_MISSING",
			Severity: Critical,
			Title:    "Title tag is missing",
			Detail:   "No <title> tag was found, or it is empty.",
			Why:      "Without a title, search engines fall back to a generated one, and the browser tab and search snippet lose the clearest signal of what the page is about.",
			Fix:      "Add a unique, descriptive <title> in the page's <head>.",
		}}
	}

	switch {
	case len(title) > 60:
		return []Finding{{
			RuleID:   "TITLE_TOO_LONG",
			Severity: Warning,
			Title:    "Title is too long",
			Detail:   fmt.Sprintf("Title is %d characters: %q", len(title), title),
			Why:      "Search engines truncate titles beyond roughly 60 characters, so the end may never be seen.",
			Fix:      "Shorten the title to under 60 characters, keeping the most important words first.",
		}}
	case len(title) < 10:
		return []Finding{{
			RuleID:   "TITLE_TOO_SHORT",
			Severity: Warning,
			Title:    "Title is too short",
			Detail:   fmt.Sprintf("Title is %d characters: %q", len(title), title),
			Why:      "A very short title rarely describes the page well enough to stand out in search results.",
			Fix:      "Expand the title to describe the page more specifically, ideally 10-60 characters.",
		}}
	}

	return nil
}

type DescriptionRule struct{}

func (DescriptionRule) ID() string { return "description" }

func (DescriptionRule) Check(f *parser.PageFacts) []Finding {
	desc := strings.TrimSpace(f.Description)
	if desc == "" {
		return []Finding{{
			RuleID:   "DESC_MISSING",
			Severity: Warning,
			Title:    "Meta description is missing",
			Detail:   `No <meta name="description"> tag was found.`,
			Why:      "Without it, search engines generate their own snippet from page content — often less compelling and inconsistent across searches.",
			Fix:      `Add <meta name="description" content="..."> with 50-160 characters summarizing the page.`,
		}}
	}

	if len(desc) < 50 || len(desc) > 160 {
		return []Finding{{
			RuleID:   "DESC_LENGTH",
			Severity: Info,
			Title:    "Meta description length is outside the ideal range",
			Detail:   fmt.Sprintf("Description is %d characters (ideal: 50-160).", len(desc)),
			Why:      "Descriptions outside this range are often truncated, or padded with the search engine's own text.",
			Fix:      "Aim for 50-160 characters that summarize the page and encourage a click.",
		}}
	}

	return nil
}

type CanonicalRule struct{}

func (CanonicalRule) ID() string { return "canonical" }

func (CanonicalRule) Check(f *parser.PageFacts) []Finding {
	canonical := strings.TrimSpace(f.Canonical)
	if canonical == "" {
		return []Finding{{
			RuleID:   "CANONICAL_MISSING",
			Severity: Info,
			Title:    "No canonical tag",
			Detail:   `This page has no <link rel="canonical">.`,
			Why:      "Without one, search engines have to guess which URL variant (with/without trailing slash, query params, etc.) is the primary one.",
			Fix:      `Add <link rel="canonical" href="..."> pointing to this page's preferred URL.`,
		}}
	}

	canonicalURL, err := url.Parse(canonical)
	if err != nil {
		return nil
	}

	if !canonicalURL.IsAbs() {
		return []Finding{{
			RuleID:   "CANONICAL_RELATIVE",
			Severity: Warning,
			Title:    "Canonical uses a relative URL",
			Detail:   fmt.Sprintf("Canonical is %q, which is not an absolute URL.", canonical),
			Why:      "Some crawlers resolve relative canonicals incorrectly, especially after redirects.",
			Fix:      "Use an absolute URL, including scheme and host, in the canonical tag.",
		}}
	}

	pageURL, err := url.Parse(f.URL)
	if err != nil {
		return nil
	}

	if !sameLogicalPage(pageURL, canonicalURL) {
		return []Finding{{
			RuleID:   "CANONICAL_MISMATCH",
			Severity: Critical,
			Title:    "Canonical points to a different page",
			Detail:   fmt.Sprintf("Canonical points to %s, but the page URL is %s.", canonical, f.URL),
			Why:      "Canonical tells search engines which page is the primary version. Pointing elsewhere marks this page as a duplicate, so it won't be indexed on its own.",
			Fix:      "Set a canonical per page, matching that page's own URL, unless you're intentionally consolidating near-duplicate URLs.",
			Evidence: fmt.Sprintf(`<link rel="canonical" href=%q/>`, canonical),
		}}
	}

	return nil
}

// sameLogicalPage treats a differing trailing slash or "www." prefix as
// the same page — fsd.md's stated exception for CANONICAL_MISMATCH.
func sameLogicalPage(a, b *url.URL) bool {
	normalize := func(u *url.URL) (host, path string) {
		return strings.TrimPrefix(strings.ToLower(u.Host), "www."), strings.TrimSuffix(u.Path, "/")
	}
	aHost, aPath := normalize(a)
	bHost, bPath := normalize(b)
	return aHost == bHost && aPath == bPath
}
