package parser

import (
	"strings"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

const sampleHTML = `
<!doctype html>
<html>
<head>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});})(window,document,'script','dataLayer','GTM-ABCD123');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345"></script>
<script>window.dataLayer = window.dataLayer || [];
dataLayer.push({"event":"purchase","value":299000,"currency":"IDR"});
dataLayer.push({'event':'view_item','item_name':'Shell AX7'});</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Shell Advance AX7","image":"https://x/y.jpg","offers":{"@type":"Offer","price":"52000"}}
</script>
<script type="application/ld+json">{ not valid json }</script>
</head>
<body>
<script id="__NEXT_DATA__" type="application/json">{"props":{},"page":"/p"}</script>
</body>
</html>`

func parseSample(t *testing.T, html string) PageData {
	t.Helper()
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	return extractPageData(doc, html)
}

func TestExtractPageData_TagIDs(t *testing.T) {
	pd := parseSample(t, sampleHTML)

	if len(pd.GTMIDs) != 1 || pd.GTMIDs[0] != "GTM-ABCD123" {
		t.Errorf("GTMIDs = %v, want [GTM-ABCD123]", pd.GTMIDs)
	}
	if len(pd.GAIDs) != 1 || pd.GAIDs[0] != "G-ABCDE12345" {
		t.Errorf("GAIDs = %v, want [G-ABCDE12345]", pd.GAIDs)
	}
}

func TestExtractPageData_DataLayer(t *testing.T) {
	pd := parseSample(t, sampleHTML)

	// The double-quoted push parses; the single-quoted one is JS, not
	// JSON, so it falls through to raw untouched.
	foundParsed := false
	for _, entry := range pd.DataLayer {
		if strings.Contains(string(entry), `"event":"purchase"`) {
			foundParsed = true
		}
	}
	if !foundParsed {
		t.Errorf("expected the purchase push in DataLayer, got %v", pd.DataLayer)
	}

	foundRaw := false
	for _, raw := range pd.DataLayerRaw {
		if strings.Contains(raw, "view_item") {
			foundRaw = true
		}
	}
	if !foundRaw {
		t.Errorf("expected the single-quoted push in DataLayerRaw, got %v", pd.DataLayerRaw)
	}
}

func TestExtractPageData_JSONLD(t *testing.T) {
	pd := parseSample(t, sampleHTML)

	if len(pd.JSONLD) != 2 {
		t.Fatalf("JSONLD blocks = %d, want 2", len(pd.JSONLD))
	}

	var valid, invalid int
	for _, b := range pd.JSONLD {
		if b.Valid {
			valid++
			if len(b.Types) != 1 || b.Types[0] != "Product" {
				t.Errorf("valid block types = %v, want [Product]", b.Types)
			}
		} else {
			invalid++
		}
	}
	if valid != 1 || invalid != 1 {
		t.Errorf("valid=%d invalid=%d, want 1 and 1", valid, invalid)
	}
}

func TestExtractPageData_NextData(t *testing.T) {
	pd := parseSample(t, sampleHTML)
	if !pd.NextData.Present || pd.NextData.Format != "__NEXT_DATA__" {
		t.Errorf("NextData = %+v, want present __NEXT_DATA__", pd.NextData)
	}

	appRouter := parseSample(t, `<html><body><script>self.__next_f=[];self.__next_f.push([1])</script></body></html>`)
	if !appRouter.NextData.Present || appRouter.NextData.Format != "__next_f" {
		t.Errorf("App Router NextData = %+v, want present __next_f", appRouter.NextData)
	}
}

func TestExtractPageData_EmptyPage(t *testing.T) {
	pd := parseSample(t, `<html><head><title>Nothing</title></head><body>hi</body></html>`)
	if len(pd.GTMIDs) != 0 || len(pd.GAIDs) != 0 || len(pd.JSONLD) != 0 || pd.NextData.Present {
		t.Errorf("expected all-empty PageData, got %+v", pd)
	}
}
