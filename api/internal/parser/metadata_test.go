package parser

import (
	"testing"

	"github.com/yaaqin/builder-tool/internal/fetcher"
)

func extractMetadataFromHTML(t *testing.T, html string) *MetadataResult {
	t.Helper()
	res := &fetcher.FetchResult{Body: []byte(html)}
	md, err := ExtractMetadata(res, "https://example.com/page")
	if err != nil {
		t.Fatalf("ExtractMetadata: %v", err)
	}
	return md
}

func tagValue(t *testing.T, md *MetadataResult, tag string) string {
	t.Helper()
	for _, mt := range md.Tags {
		if mt.Tag == tag {
			return mt.Value
		}
	}
	t.Fatalf("tag %q not present in result", tag)
	return ""
}

func TestExtractMetadata_Tags(t *testing.T) {
	html := `<!doctype html>
<html><head>
<title>Hello World</title>
<meta name="description" content="A description">
<meta name="keywords" content="foo, bar">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://example.com/canonical">
<meta property="og:title" content="OG Title">
<meta property="og:description" content="OG Description">
<meta property="og:image" content="/images/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Twitter Title">
<meta name="twitter:description" content="Twitter Description">
<meta name="twitter:image" content="https://cdn.example.com/tw.jpg">
<link rel="icon" href="/favicon.ico">
</head><body><h1>Only Heading</h1></body></html>`

	md := extractMetadataFromHTML(t, html)

	cases := map[string]string{
		"title":               "Hello World",
		"description":         "A description",
		"keywords":            "foo, bar",
		"robots":              "noindex, follow",
		"canonical":           "https://example.com/canonical",
		"og:title":            "OG Title",
		"og:description":      "OG Description",
		"og:image":            "https://example.com/images/og.jpg",
		"twitter:card":        "summary_large_image",
		"twitter:title":       "Twitter Title",
		"twitter:description": "Twitter Description",
		"twitter:image":       "https://cdn.example.com/tw.jpg",
		"favicon":             "https://example.com/favicon.ico",
	}
	for tag, want := range cases {
		if got := tagValue(t, md, tag); got != want {
			t.Errorf("tag %q = %q, want %q", tag, got, want)
		}
	}
}

func TestExtractMetadata_MissingTagsAreEmpty(t *testing.T) {
	md := extractMetadataFromHTML(t, `<html><head></head><body></body></html>`)

	for _, mt := range md.Tags {
		if mt.Value != "" {
			t.Errorf("tag %q = %q, want empty on a bare page", mt.Tag, mt.Value)
		}
	}
}

func TestExtractMetadata_H1Count(t *testing.T) {
	cases := []struct {
		name string
		html string
		want []string
	}{
		{"none", `<html><body><h2>Not an H1</h2></body></html>`, nil},
		{"one", `<html><body><h1> The Heading </h1></body></html>`, []string{"The Heading"}},
		{"duplicate", `<html><body><h1>First</h1><h1>Second</h1></body></html>`, []string{"First", "Second"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			md := extractMetadataFromHTML(t, tc.html)
			if len(md.H1s) != len(tc.want) {
				t.Fatalf("H1s = %v, want %v", md.H1s, tc.want)
			}
			for i, w := range tc.want {
				if md.H1s[i] != w {
					t.Errorf("H1s[%d] = %q, want %q", i, md.H1s[i], w)
				}
			}
		})
	}
}
