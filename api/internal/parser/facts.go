package parser

import (
	"encoding/json"
	"time"
)

// PageFacts holds raw, unjudged facts about a page — enough for the
// metadata and indexability rules. Fields for later rule categories
// (headings, images, links) are added when those rules are, not before.
//
// Parse is only ever called once the fetch outcome is OK (see
// fetcher.Outcome) — a blocked or errored fetch never reaches here, so
// there's nothing to represent that state at this layer.
type PageFacts struct {
	URL          string
	FinalURL     string
	StatusCode   int
	RedirectHops []string
	FetchedAt    time.Time
	Duration     time.Duration

	Title       string
	Description string
	Canonical   string
	Robots      string

	PageData PageData
}

// PageData is what the page exposes to analytics / crawlers *in the raw
// HTML*, before any JavaScript runs. The runtime dataLayer (after GTM
// loads and events fire) needs a headless browser and isn't captured
// here — see prd.md fase 2.
type PageData struct {
	GTMIDs       []string          // GTM-XXXX container IDs
	GAIDs        []string          // G-XXXX / UA-XXXX-X / AW-XXXX measurement IDs
	DataLayer    []json.RawMessage // inline dataLayer entries that parsed as JSON
	DataLayerRaw []string          // inline dataLayer snippets that didn't parse (JS, not JSON)
	JSONLD       []JSONLDBlock
	NextData     NextData
}

type JSONLDBlock struct {
	Types []string        // @type value(s), flattened
	Valid bool            // did it parse as JSON
	Raw   json.RawMessage // parsed content when Valid
}

type NextData struct {
	Present bool
	Format  string // "__NEXT_DATA__" (Pages Router) | "__next_f" (App Router) | ""
}
