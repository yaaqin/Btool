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
	// InvalidJSONLD counts <script type="application/ld+json"> blocks that
	// didn't parse as JSON. They're left out of the "json-ld" tag value.
	InvalidJSONLD int
}

// ExtractMetadata parses the fetched HTML and pulls the metadata tags in a
// fixed, display-ready order. pageURL (the final URL after redirects) is
// used to resolve relative favicon/image URLs to absolute ones.
func ExtractMetadata(res *fetcher.FetchResult, pageURL string) (*MetadataResult, error) {
	return ExtractMetadataFromHTML(string(res.Body), pageURL)
}

// ExtractMetadataFromHTML is ExtractMetadata for HTML that didn't come from
// fetcher.Fetch — e.g. the DOM serialized by the render service after
// JavaScript ran. Running both through one extractor keeps the raw and
// rendered columns of the report directly comparable.
func ExtractMetadataFromHTML(html, pageURL string) (*MetadataResult, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, err
	}

	var pd PageData
	extractJSONLD(doc, &pd)
	jsonLD, invalidJSONLD := jsonLDSummary(pd.JSONLD)

	htmlLang, _ := doc.Find("html").First().Attr("lang")

	tags := []MetaTag{
		{"title", strings.TrimSpace(doc.Find("title").First().Text())},
		{"description", metaContent(doc, `meta[name="description"]`)},
		{"keywords", metaContent(doc, `meta[name="keywords"]`)},
		{"robots", metaContent(doc, `meta[name="robots"]`)},
		{"canonical", linkHref(doc, `link[rel="canonical"]`)},
		{"html lang", strings.TrimSpace(htmlLang)},
		{"hreflang", hreflangList(doc, pageURL)},
		{"og:title", metaProperty(doc, "og:title")},
		{"og:description", metaProperty(doc, "og:description")},
		{"og:url", metaProperty(doc, "og:url")},
		{"og:image", resolveURL(pageURL, metaProperty(doc, "og:image"))},
		{"og:image:type", metaProperty(doc, "og:image:type")},
		{"og:image:width", metaProperty(doc, "og:image:width")},
		{"og:image:height", metaProperty(doc, "og:image:height")},
		{"og:image:alt", metaProperty(doc, "og:image:alt")},
		{"twitter:card", metaContent(doc, `meta[name="twitter:card"]`)},
		{"twitter:title", metaContent(doc, `meta[name="twitter:title"]`)},
		{"twitter:description", metaContent(doc, `meta[name="twitter:description"]`)},
		{"twitter:image", resolveURL(pageURL, metaContent(doc, `meta[name="twitter:image"]`))},
		{"favicon", resolveURL(pageURL, findFavicon(doc))},
		{"json-ld", jsonLD},
	}

	return &MetadataResult{Tags: tags, H1s: h1Texts(doc), InvalidJSONLD: invalidJSONLD}, nil
}

// hreflangList renders every <link rel="alternate" hreflang> as one
// "lang: url" line each, in document order.
func hreflangList(doc *goquery.Document, pageURL string) string {
	var lines []string
	doc.Find(`link[rel="alternate"][hreflang]`).Each(func(_ int, s *goquery.Selection) {
		lang, _ := s.Attr("hreflang")
		href, _ := s.Attr("href")
		lines = append(lines, strings.TrimSpace(lang)+": "+resolveURL(pageURL, strings.TrimSpace(href)))
	})
	return strings.Join(lines, "\n")
}

// jsonLDSummary lists the @type of every valid JSON-LD block (a block with
// no @type shows as "(no @type)") and counts the blocks that didn't parse.
func jsonLDSummary(blocks []JSONLDBlock) (string, int) {
	var types []string
	invalid := 0
	for _, b := range blocks {
		switch {
		case !b.Valid:
			invalid++
		case len(b.Types) == 0:
			types = append(types, "(no @type)")
		default:
			types = append(types, b.Types...)
		}
	}
	return strings.Join(types, ", "), invalid
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
