package parser

import (
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/yaaqin/builder-tool/internal/fetcher"
)

// MetaTag is one row of the metadata report: a tag name and whatever value
// was found for it (empty when the tag is missing from the page).
type MetaTag struct {
	Tag   string
	Value string
}

// MetadataResult is every metadata tag SEO tooling cares about, plus every
// <h1> on the page. Like PageFacts, it only extracts — it doesn't judge
// whether zero or duplicate H1s are a problem.
type MetadataResult struct {
	Tags []MetaTag
	H1s  []string
}

// ExtractMetadata parses the fetched HTML and pulls the metadata tags in a
// fixed, display-ready order. pageURL (the final URL after redirects) is
// used to resolve relative favicon/image URLs to absolute ones.
func ExtractMetadata(res *fetcher.FetchResult, pageURL string) (*MetadataResult, error) {
	rawHTML := string(res.Body)
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(rawHTML))
	if err != nil {
		return nil, err
	}

	tags := []MetaTag{
		{"title", strings.TrimSpace(doc.Find("title").First().Text())},
		{"description", metaContent(doc, `meta[name="description"]`)},
		{"keywords", metaContent(doc, `meta[name="keywords"]`)},
		{"robots", metaContent(doc, `meta[name="robots"]`)},
		{"canonical", linkHref(doc, `link[rel="canonical"]`)},
		{"og:title", metaProperty(doc, "og:title")},
		{"og:description", metaProperty(doc, "og:description")},
		{"og:image", resolveURL(pageURL, metaProperty(doc, "og:image"))},
		{"twitter:card", metaContent(doc, `meta[name="twitter:card"]`)},
		{"twitter:title", metaContent(doc, `meta[name="twitter:title"]`)},
		{"twitter:description", metaContent(doc, `meta[name="twitter:description"]`)},
		{"twitter:image", resolveURL(pageURL, metaContent(doc, `meta[name="twitter:image"]`))},
		{"favicon", resolveURL(pageURL, findFavicon(doc))},
	}

	return &MetadataResult{Tags: tags, H1s: h1Texts(doc)}, nil
}

func metaProperty(doc *goquery.Document, property string) string {
	val, _ := doc.Find(`meta[property="` + property + `"]`).First().Attr("content")
	return strings.TrimSpace(val)
}

// findFavicon only reports a favicon actually declared via a <link> tag —
// it doesn't guess at the /favicon.ico convention, since that may not
// exist and we never fetch it to check.
func findFavicon(doc *goquery.Document) string {
	for _, sel := range []string{`link[rel="icon"]`, `link[rel="shortcut icon"]`, `link[rel="apple-touch-icon"]`} {
		if href := linkHref(doc, sel); href != "" {
			return href
		}
	}
	return ""
}

func resolveURL(base, ref string) string {
	if ref == "" {
		return ""
	}
	baseURL, err := url.Parse(base)
	if err != nil {
		return ref
	}
	refURL, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return baseURL.ResolveReference(refURL).String()
}

func h1Texts(doc *goquery.Document) []string {
	var out []string
	doc.Find("h1").Each(func(_ int, s *goquery.Selection) {
		out = append(out, strings.TrimSpace(s.Text()))
	})
	return out
}
