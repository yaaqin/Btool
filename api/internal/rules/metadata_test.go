package rules_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/rules"
)

func TestTitleRule(t *testing.T) {
	cases := []struct {
		name    string
		title   string
		wantID  string
		wantSev rules.Severity
		wantNil bool
	}{
		{name: "missing", title: "", wantID: "TITLE_MISSING", wantSev: rules.Critical},
		{name: "too short", title: "Home", wantID: "TITLE_TOO_SHORT", wantSev: rules.Warning},
		{name: "too long", title: "This title is deliberately way too long to fit in a search result snippet at all", wantID: "TITLE_TOO_LONG", wantSev: rules.Warning},
		{name: "just right", title: "Running Shoes - AstraOtoshop", wantNil: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			findings := rules.TitleRule{}.Check(&parser.PageFacts{Title: tc.title})
			if tc.wantNil {
				assert.Empty(t, findings)
				return
			}
			require.Len(t, findings, 1)
			assert.Equal(t, tc.wantID, findings[0].RuleID)
			assert.Equal(t, tc.wantSev, findings[0].Severity)
		})
	}
}

func TestCanonicalRule_Mismatch(t *testing.T) {
	facts := &parser.PageFacts{
		URL:       "https://example.com/product/abc",
		Canonical: "https://example.com",
	}

	findings := rules.CanonicalRule{}.Check(facts)

	require.Len(t, findings, 1)
	assert.Equal(t, "CANONICAL_MISMATCH", findings[0].RuleID)
	assert.Equal(t, rules.Critical, findings[0].Severity)
}

func TestCanonicalRule_AllowsTrailingSlashAndWWW(t *testing.T) {
	cases := []struct {
		name      string
		url       string
		canonical string
	}{
		{name: "trailing slash", url: "https://example.com/product/abc", canonical: "https://example.com/product/abc/"},
		{name: "www prefix", url: "https://www.example.com/product/abc", canonical: "https://example.com/product/abc"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			findings := rules.CanonicalRule{}.Check(&parser.PageFacts{URL: tc.url, Canonical: tc.canonical})
			assert.Empty(t, findings)
		})
	}
}

func TestCanonicalRule_Missing(t *testing.T) {
	findings := rules.CanonicalRule{}.Check(&parser.PageFacts{URL: "https://example.com/page"})

	require.Len(t, findings, 1)
	assert.Equal(t, "CANONICAL_MISSING", findings[0].RuleID)
	assert.Equal(t, rules.Info, findings[0].Severity)
}

func TestCanonicalRule_Relative(t *testing.T) {
	findings := rules.CanonicalRule{}.Check(&parser.PageFacts{
		URL:       "https://example.com/page",
		Canonical: "/page",
	})

	require.Len(t, findings, 1)
	assert.Equal(t, "CANONICAL_RELATIVE", findings[0].RuleID)
}

func TestDescriptionRule(t *testing.T) {
	t.Run("missing", func(t *testing.T) {
		findings := rules.DescriptionRule{}.Check(&parser.PageFacts{})
		require.Len(t, findings, 1)
		assert.Equal(t, "DESC_MISSING", findings[0].RuleID)
	})

	t.Run("too short", func(t *testing.T) {
		findings := rules.DescriptionRule{}.Check(&parser.PageFacts{Description: "Too short."})
		require.Len(t, findings, 1)
		assert.Equal(t, "DESC_LENGTH", findings[0].RuleID)
		assert.Equal(t, rules.Info, findings[0].Severity)
	})

	t.Run("good length", func(t *testing.T) {
		findings := rules.DescriptionRule{}.Check(&parser.PageFacts{
			Description: "Running shoes built for daily training, with breathable mesh and responsive cushioning for every pace.",
		})
		assert.Empty(t, findings)
	})
}
