package parser

import (
	"time"

	"github.com/yaaqin/builder-tool/internal/fetcher"
)

// PageFacts holds raw, unjudged facts about a page — enough for the
// metadata and indexability rules. Fields for later rule categories
// (headings, images, links, structured data) are added when those rules
// are, not before.
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

	RobotsTxt *fetcher.RobotsTxtInfo
}
