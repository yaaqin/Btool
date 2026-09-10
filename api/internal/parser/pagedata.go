package parser

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

var (
	gtmRe = regexp.MustCompile(`GTM-[A-Z0-9]{4,10}`)
	gaRe  = regexp.MustCompile(`\b(?:G-[A-Z0-9]{6,12}|UA-\d{4,10}-\d{1,4}|AW-\d{6,12})\b`)

	// dataLayerPushRe grabs the argument of a dataLayer.push(...) call.
	// It stops at the outermost matching paren via a lazy match plus a
	// trailing ")" — good enough for the single-line pushes GTM and most
	// tag setups emit; multi-line or deeply nested calls fall through to
	// the raw list.
	dataLayerPushRe = regexp.MustCompile(`(?s)dataLayer\s*\.\s*push\s*\(\s*(\{.*?\})\s*\)`)
	// dataLayerInitRe grabs an inline "dataLayer = [ ... ]" initializer.
	dataLayerInitRe = regexp.MustCompile(`(?s)dataLayer\s*=\s*(\[.*?\])`)
)

// extractPageData scans the raw HTML for what the page hands to analytics
// and crawlers before JavaScript executes.
func extractPageData(doc *goquery.Document, rawHTML string) PageData {
	pd := PageData{
		GTMIDs: dedupe(gtmRe.FindAllString(rawHTML, -1)),
		GAIDs:  dedupe(gaRe.FindAllString(rawHTML, -1)),
	}

	extractJSONLD(doc, &pd)
	extractNextData(doc, rawHTML, &pd)
	extractDataLayer(doc, &pd)

	return pd
}

func extractJSONLD(doc *goquery.Document, pd *PageData) {
	doc.Find(`script[type="application/ld+json"]`).Each(func(_ int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if text == "" {
			return
		}

		block := JSONLDBlock{}
		var parsed any
		if err := json.Unmarshal([]byte(text), &parsed); err != nil {
			pd.JSONLD = append(pd.JSONLD, block) // Valid stays false
			return
		}

		block.Valid = true
		block.Raw = json.RawMessage(text)
		block.Types = jsonLDTypes(parsed)
		pd.JSONLD = append(pd.JSONLD, block)
	})
}

// jsonLDTypes pulls @type from a JSON-LD document, which may be a single
// object, an array of objects, or a @graph wrapper.
func jsonLDTypes(v any) []string {
	var out []string
	switch node := v.(type) {
	case []any:
		for _, item := range node {
			out = append(out, jsonLDTypes(item)...)
		}
	case map[string]any:
		if graph, ok := node["@graph"].([]any); ok {
			for _, item := range graph {
				out = append(out, jsonLDTypes(item)...)
			}
		}
		switch t := node["@type"].(type) {
		case string:
			out = append(out, t)
		case []any:
			for _, tv := range t {
				if s, ok := tv.(string); ok {
					out = append(out, s)
				}
			}
		}
	}
	return dedupe(out)
}

func extractNextData(doc *goquery.Document, rawHTML string, pd *PageData) {
	if doc.Find(`script#__NEXT_DATA__`).Length() > 0 {
		pd.NextData = NextData{Present: true, Format: "__NEXT_DATA__"}
		return
	}
	if strings.Contains(rawHTML, "self.__next_f") {
		pd.NextData = NextData{Present: true, Format: "__next_f"}
	}
}

// extractDataLayer pulls dataLayer entries out of inline scripts. The
// content is JavaScript, not JSON, so anything that doesn't parse cleanly
// is kept as a raw snippet rather than guessed at.
func extractDataLayer(doc *goquery.Document, pd *PageData) {
	doc.Find("script").Each(func(_ int, s *goquery.Selection) {
		if _, hasSrc := s.Attr("src"); hasSrc {
			return
		}
		text := s.Text()
		if !strings.Contains(text, "dataLayer") {
			return
		}

		for _, m := range dataLayerPushRe.FindAllStringSubmatch(text, -1) {
			addDataLayerEntry(pd, m[1])
		}
		for _, m := range dataLayerInitRe.FindAllStringSubmatch(text, -1) {
			var arr []json.RawMessage
			if err := json.Unmarshal([]byte(m[1]), &arr); err == nil {
				pd.DataLayer = append(pd.DataLayer, arr...)
			} else {
				pd.DataLayerRaw = append(pd.DataLayerRaw, strings.TrimSpace(m[1]))
			}
		}
	})
}

func addDataLayerEntry(pd *PageData, snippet string) {
	trimmed := strings.TrimSpace(snippet)
	var obj json.RawMessage
	if err := json.Unmarshal([]byte(trimmed), &obj); err == nil {
		pd.DataLayer = append(pd.DataLayer, obj)
		return
	}
	pd.DataLayerRaw = append(pd.DataLayerRaw, trimmed)
}

func dedupe(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	seen := make(map[string]bool, len(in))
	var out []string
	for _, v := range in {
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
	}
	return out
}
