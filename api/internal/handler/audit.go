package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/yaaqin/builder-tool/internal/fetcher"
	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/report"
	"github.com/yaaqin/builder-tool/internal/rules"
)

// registry is the fixed set of rules run against every audit. Adding a
// rule means adding it here — nothing else in this file changes.
var registry = rules.NewRegistry(
	rules.TitleRule{},
	rules.DescriptionRule{},
	rules.CanonicalRule{},
	rules.HTTPStatusRule{},
	rules.RobotsNoindexRule{},
	rules.RobotsTxtRule{},
	rules.RedirectRule{},
)

type auditRequest struct {
	URL string `json:"url"`
}

type auditResponse struct {
	URL        string         `json:"url"`
	FinalURL   string         `json:"final_url"`
	StatusCode int            `json:"status_code"`
	FetchedAt  time.Time      `json:"fetched_at"`
	DurationMs int64          `json:"duration_ms"`
	Summary    report.Summary `json:"summary"`
	Facts      auditFacts     `json:"facts"`
	Findings   []findingDTO   `json:"findings"`
}

type auditFacts struct {
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Canonical   string `json:"canonical,omitempty"`
	Robots      string `json:"robots,omitempty"`
}

type findingDTO struct {
	RuleID   string `json:"rule_id"`
	Severity string `json:"severity"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Why      string `json:"why"`
	Fix      string `json:"fix"`
	Evidence string `json:"evidence,omitempty"`
}

// CreateAudit handles POST /api/v1/audits. It's synchronous for now (see
// fsd.md section 10 step 4) — the async job + SSE variant in section 6
// comes once rendering (fase 2) makes requests slow enough to need it.
func CreateAudit(w http.ResponseWriter, r *http.Request) {
	var req auditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), fetcher.Timeout)
	defer cancel()

	var pageResult *fetcher.FetchResult
	var robotsInfo *fetcher.RobotsTxtInfo

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		res, err := fetcher.Fetch(gctx, req.URL)
		if err != nil {
			return err
		}
		pageResult = res
		return nil
	})
	g.Go(func() error {
		robotsInfo = fetcher.FetchRobotsTxt(gctx, req.URL)
		return nil
	})

	if err := g.Wait(); err != nil {
		status, message := fetchErrorResponse(err)
		writeError(w, status, message)
		return
	}

	facts, err := parser.Parse(pageResult, req.URL, robotsInfo)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not parse page HTML")
		return
	}

	findings := report.Sort(registry.Run(facts))

	resp := auditResponse{
		URL:        facts.URL,
		FinalURL:   facts.FinalURL,
		StatusCode: facts.StatusCode,
		FetchedAt:  facts.FetchedAt,
		DurationMs: facts.Duration.Milliseconds(),
		Summary:    report.Summarize(findings),
		Facts: auditFacts{
			Title:       facts.Title,
			Description: facts.Description,
			Canonical:   facts.Canonical,
			Robots:      facts.Robots,
		},
		Findings: toFindingDTOs(findings),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func toFindingDTOs(findings []rules.Finding) []findingDTO {
	out := make([]findingDTO, len(findings))
	for i, f := range findings {
		out[i] = findingDTO{
			RuleID:   f.RuleID,
			Severity: f.Severity.String(),
			Title:    f.Title,
			Detail:   f.Detail,
			Why:      f.Why,
			Fix:      f.Fix,
			Evidence: f.Evidence,
		}
	}
	return out
}

func fetchErrorResponse(err error) (int, string) {
	switch {
	case errors.Is(err, fetcher.ErrInvalidURL), errors.Is(err, fetcher.ErrSchemeNotAllowed):
		return http.StatusBadRequest, "invalid URL"
	case errors.Is(err, fetcher.ErrPrivateAddress):
		return http.StatusBadRequest, "URL resolves to a private or reserved address"
	case errors.Is(err, fetcher.ErrDNSFailed):
		return http.StatusBadGateway, "could not resolve host"
	case errors.Is(err, fetcher.ErrTooManyRedirects):
		return http.StatusBadGateway, "too many redirects"
	default:
		return http.StatusBadGateway, "could not fetch the page"
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
