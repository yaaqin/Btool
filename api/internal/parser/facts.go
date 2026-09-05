package parser

import "time"

// PageFacts holds raw, unjudged facts about a page — enough for the
// metadata and indexability rules. Fields for later rule categories
// (headings, images, links, structured data) are added when those rules
// are, not before.
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
}
