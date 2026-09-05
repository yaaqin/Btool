package parser

import (
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/yaaqin/builder-tool/internal/fetcher"
)

// Parse extracts raw facts from fetched HTML. It only extracts; it never
// judges whether a fact is a problem — that's the rules package's job.
func Parse(res *fetcher.FetchResult, requestedURL string) (*PageFacts, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(res.Body)))
	if err != nil {
		return nil, err
	}

	return &PageFacts{
		URL:          requestedURL,
		FinalURL:     res.FinalURL,
		StatusCode:   res.StatusCode,
		RedirectHops: res.RedirectHops,
		FetchedAt:    res.FetchedAt,
		Duration:     res.Duration,

		Title:       strings.TrimSpace(doc.Find("title").First().Text()),
		Description: metaContent(doc, `meta[name="description"]`),
		Canonical:   linkHref(doc, `link[rel="canonical"]`),
		Robots:      metaContent(doc, `meta[name="robots"]`),
	}, nil
}

func metaContent(doc *goquery.Document, selector string) string {
	val, _ := doc.Find(selector).First().Attr("content")
	return strings.TrimSpace(val)
}

func linkHref(doc *goquery.Document, selector string) string {
	val, _ := doc.Find(selector).First().Attr("href")
	return strings.TrimSpace(val)
}
