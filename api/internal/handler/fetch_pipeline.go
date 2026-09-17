package handler

import (
	"context"
	"time"

	"github.com/yaaqin/builder-tool/internal/fetcher"
)

// fetchOutcome is the result of running the shared fetch pipeline: the
// robots.txt check followed by the page fetch itself, classified into a
// fetcher.Outcome. Result is nil whenever Outcome != fetcher.OutcomeOK.
type fetchOutcome struct {
	Result     *fetcher.FetchResult
	Outcome    fetcher.Outcome
	StatusCode int
	FinalURL   string
	FetchedAt  time.Time
	Duration   time.Duration
}

// fetchPage runs the fetch pipeline shared by every content-analysis
// endpoint (audit, metadata): honor robots.txt first, then fetch the page
// and classify what came back. requestedPath is the already-validated
// URL's path, used to match the robots.txt group.
func fetchPage(ctx context.Context, requestedURL, requestedPath string, ua fetcher.UserAgent) fetchOutcome {
	robotsInfo := fetcher.FetchRobotsTxt(ctx, requestedURL, ua.HTTPHeader)
	if !robotsInfo.Allowed(requestedPath, ua.RobotsToken) {
		return fetchOutcome{
			Outcome:   fetcher.OutcomeBlockedByRobots,
			FinalURL:  requestedURL,
			FetchedAt: time.Now(),
		}
	}

	pageResult, fetchErr := fetcher.Fetch(ctx, requestedURL, ua.HTTPHeader)

	fo := fetchOutcome{Result: pageResult, FinalURL: requestedURL, FetchedAt: time.Now()}
	if pageResult != nil {
		fo.StatusCode = pageResult.StatusCode
		fo.FinalURL = pageResult.FinalURL
		fo.FetchedAt = pageResult.FetchedAt
		fo.Duration = pageResult.Duration
	}
	fo.Outcome = fetcher.ClassifyOutcome(fetchErr, fo.StatusCode)
	return fo
}
