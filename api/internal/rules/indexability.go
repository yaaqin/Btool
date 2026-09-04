package rules

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/yaaqin/builder-tool/internal/parser"
)

type HTTPStatusRule struct{}

func (HTTPStatusRule) ID() string { return "http_status" }

func (HTTPStatusRule) Check(f *parser.PageFacts) []Finding {
	if f.StatusCode < 200 || f.StatusCode >= 300 {
		return []Finding{{
			RuleID:   "HTTP_STATUS_NOT_OK",
			Severity: Critical,
			Title:    "Page did not respond with a 2xx status",
			Detail:   fmt.Sprintf("Final response status was %d.", f.StatusCode),
			Why:      "Search engines generally won't index pages that don't return a success status.",
			Fix:      "Make sure the page responds with 200 OK, or fix the redirect or error causing this status.",
		}}
	}
	return nil
}

// searchPathPattern matches paths/query params that usually mean "this is
// a search-results page" — see the noindex context note below.
var searchPathPattern = regexp.MustCompile(`(?i)(/search|/cari|/hasil-pencarian|[?&](q|query|s|search)=)`)

type RobotsNoindexRule struct{}

func (RobotsNoindexRule) ID() string { return "robots_noindex" }

func (RobotsNoindexRule) Check(f *parser.PageFacts) []Finding {
	if !strings.Contains(strings.ToLower(f.Robots), "noindex") {
		return nil
	}

	// noindex is not always a mistake: search-result pages are commonly
	// excluded from indexing on purpose. Flagging it as Critical there
	// would be a false positive that erodes trust faster than a missed
	// issue would — see fsd.md's note on ROBOTS_NOINDEX.
	if searchPathPattern.MatchString(f.URL) {
		return []Finding{{
			RuleID:   "ROBOTS_NOINDEX",
			Severity: Info,
			Title:    "Page is noindex (likely intentional)",
			Detail:   "This looks like a search-results page, where noindex is usually correct.",
			Why:      "Search-result pages are commonly excluded from indexing on purpose, to avoid low-value duplicate content.",
			Fix:      "No action needed if this is intentional. Remove the noindex directive if it isn't.",
		}}
	}

	return []Finding{{
		RuleID:   "ROBOTS_NOINDEX",
		Severity: Critical,
		Title:    "Page is marked noindex",
		Detail:   fmt.Sprintf("Robots meta tag is %q.", f.Robots),
		Why:      "A noindex page is dropped from search results even if everything else about it is correct.",
		Fix:      "Remove noindex from the meta robots tag if this page should be indexed.",
	}}
}

type RobotsTxtRule struct{}

func (RobotsTxtRule) ID() string { return "robots_txt" }

func (RobotsTxtRule) Check(f *parser.PageFacts) []Finding {
	if f.RobotsTxt == nil || !f.RobotsTxt.Fetched {
		return nil
	}

	u, err := url.Parse(f.URL)
	if err != nil {
		return nil
	}

	if f.RobotsTxt.Blocks(u.Path) {
		return []Finding{{
			RuleID:   "ROBOTS_TXT_BLOCKS",
			Severity: Critical,
			Title:    "robots.txt blocks this page",
			Detail:   fmt.Sprintf("robots.txt disallows a path matching %s.", u.Path),
			Why:      "Crawlers that respect robots.txt won't even fetch this page, regardless of its content.",
			Fix:      "Update robots.txt to allow this path, if it should be crawlable.",
		}}
	}
	return nil
}

type RedirectRule struct{}

func (RedirectRule) ID() string { return "redirect" }

func (RedirectRule) Check(f *parser.PageFacts) []Finding {
	var findings []Finding

	if len(f.RedirectHops) > 2 {
		findings = append(findings, Finding{
			RuleID:   "REDIRECT_CHAIN",
			Severity: Warning,
			Title:    "Long redirect chain",
			Detail:   fmt.Sprintf("This URL redirected %d times before reaching %s.", len(f.RedirectHops), f.FinalURL),
			Why:      "Each redirect hop adds latency and burns part of a crawler's fetch budget; some crawlers give up before the end.",
			Fix:      "Point links directly at the final URL instead of chaining redirects.",
		})
	}

	origPath := pathOf(f.URL)
	finalPath := pathOf(f.FinalURL)
	if origPath != "/" && finalPath == "/" && f.URL != f.FinalURL {
		findings = append(findings, Finding{
			RuleID:   "REDIRECT_TO_ROOT",
			Severity: Warning,
			Title:    "Redirects to the homepage",
			Detail:   fmt.Sprintf("%s redirected to the homepage (%s).", f.URL, f.FinalURL),
			Why:      "This is often an unintentional soft-404 — the page you asked for doesn't exist anymore, but it returns 200 anyway.",
			Fix:      "Return a proper 404 for missing pages, or fix the redirect target if the page actually moved.",
		})
	}

	return findings
}

func pathOf(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	return u.Path
}
