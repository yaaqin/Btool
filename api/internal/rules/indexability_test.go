package rules_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yaaqin/builder-tool/internal/fetcher"
	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/rules"
)

func TestHTTPStatusRule(t *testing.T) {
	t.Run("flags non-2xx", func(t *testing.T) {
		findings := rules.HTTPStatusRule{}.Check(&parser.PageFacts{StatusCode: 404})
		require.Len(t, findings, 1)
		assert.Equal(t, "HTTP_STATUS_NOT_OK", findings[0].RuleID)
		assert.Equal(t, rules.Critical, findings[0].Severity)
	})

	t.Run("allows 200", func(t *testing.T) {
		findings := rules.HTTPStatusRule{}.Check(&parser.PageFacts{StatusCode: 200})
		assert.Empty(t, findings)
	})
}

func TestRobotsNoindexRule(t *testing.T) {
	t.Run("critical on an ordinary page", func(t *testing.T) {
		findings := rules.RobotsNoindexRule{}.Check(&parser.PageFacts{
			URL:    "https://example.com/product/abc",
			Robots: "noindex",
		})
		require.Len(t, findings, 1)
		assert.Equal(t, rules.Critical, findings[0].Severity)
	})

	t.Run("info on a search results page", func(t *testing.T) {
		findings := rules.RobotsNoindexRule{}.Check(&parser.PageFacts{
			URL:    "https://example.com/search?q=shoes",
			Robots: "noindex",
		})
		require.Len(t, findings, 1)
		assert.Equal(t, rules.Info, findings[0].Severity)
	})

	t.Run("no finding without noindex", func(t *testing.T) {
		findings := rules.RobotsNoindexRule{}.Check(&parser.PageFacts{URL: "https://example.com/page"})
		assert.Empty(t, findings)
	})
}

func TestRobotsTxtRule(t *testing.T) {
	blocked := &fetcher.RobotsTxtInfo{Fetched: true, Disallow: []string{"/admin"}}

	t.Run("blocked path", func(t *testing.T) {
		findings := rules.RobotsTxtRule{}.Check(&parser.PageFacts{
			URL:       "https://example.com/admin/settings",
			RobotsTxt: blocked,
		})
		require.Len(t, findings, 1)
		assert.Equal(t, "ROBOTS_TXT_BLOCKS", findings[0].RuleID)
	})

	t.Run("allowed path", func(t *testing.T) {
		findings := rules.RobotsTxtRule{}.Check(&parser.PageFacts{
			URL:       "https://example.com/product/abc",
			RobotsTxt: blocked,
		})
		assert.Empty(t, findings)
	})

	t.Run("no robots.txt fetched", func(t *testing.T) {
		findings := rules.RobotsTxtRule{}.Check(&parser.PageFacts{
			URL:       "https://example.com/admin",
			RobotsTxt: &fetcher.RobotsTxtInfo{Fetched: false},
		})
		assert.Empty(t, findings)
	})
}

func TestRedirectRule(t *testing.T) {
	t.Run("long chain", func(t *testing.T) {
		findings := rules.RedirectRule{}.Check(&parser.PageFacts{
			URL:          "https://example.com/a",
			FinalURL:     "https://example.com/d",
			RedirectHops: []string{"b", "c", "d"},
		})
		ids := findingIDs(findings)
		assert.Contains(t, ids, "REDIRECT_CHAIN")
	})

	t.Run("redirects to root", func(t *testing.T) {
		findings := rules.RedirectRule{}.Check(&parser.PageFacts{
			URL:      "https://example.com/old-product",
			FinalURL: "https://example.com/",
		})
		ids := findingIDs(findings)
		assert.Contains(t, ids, "REDIRECT_TO_ROOT")
	})

	t.Run("no redirect", func(t *testing.T) {
		findings := rules.RedirectRule{}.Check(&parser.PageFacts{
			URL:      "https://example.com/page",
			FinalURL: "https://example.com/page",
		})
		assert.Empty(t, findings)
	})
}

func findingIDs(findings []rules.Finding) []string {
	ids := make([]string, len(findings))
	for i, f := range findings {
		ids[i] = f.RuleID
	}
	return ids
}
