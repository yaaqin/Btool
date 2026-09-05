package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/yaaqin/builder-tool/internal/fetcher"
	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/report"
	"github.com/yaaqin/builder-tool/internal/rules"
)

// registry is the fixed set of content rules run once a page fetches
// successfully. Adding a rule means adding it here — nothing else in this
// file changes. HTTP-status and robots.txt-blocked pages never reach the
// registry at all: those are fetch Outcomes, not findings (see
// fetcher.Outcome and the blocked-page bug report this replaced).
var registry = rules.NewRegistry(
	rules.TitleRule{},
	rules.DescriptionRule{},
	rules.CanonicalRule{},
	rules.RobotsNoindexRule{},
	rules.RedirectRule{},
)

type auditRequest struct {
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
}

type auditResponse struct {
	URL            string         `json:"url"`
	FinalURL       string         `json:"final_url"`
	StatusCode     int            `json:"status_code,omitempty"`
	UserAgent      string         `json:"user_agent"`
	FetchedAt      time.Time      `json:"fetched_at"`
	DurationMs     int64          `json:"duration_ms"`
	Outcome        string         `json:"outcome"`
	OutcomeMessage string         `json:"outcome_message,omitempty"`
	Summary        report.Summary `json:"summary"`
	Facts          *auditFacts    `json:"facts,omitempty"`
	Findings       []findingDTO   `json:"findings"`
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
//
// Content analysis only runs when the fetch Outcome is OK. A blocked or
// errored fetch returns immediately with that Outcome and a human-readable
// message instead of running rules against whatever body (if any) came
// back — see the blocked-page bug report for why a 999/anti-bot response
// must never be reported as "title missing".
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

	ua := fetcher.ResolveUserAgent(req.UserAgent)

	parsedURL, err := fetcher.ValidateURL(req.URL)
	if err != nil {
		status, message := validationErrorResponse(err)
		writeError(w, status, message)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), fetcher.Timeout)
	defer cancel()

	robotsInfo := fetcher.FetchRobotsTxt(ctx, req.URL, ua.HTTPHeader)
	if !robotsInfo.Allowed(parsedURL.Path, ua.RobotsToken) {
		writeOutcome(w, req.URL, req.URL, 0, ua, fetcher.OutcomeBlockedByRobots, time.Now(), 0)
		return
	}

	pageResult, fetchErr := fetcher.Fetch(ctx, req.URL, ua.HTTPHeader)

	statusCode := 0
	finalURL := req.URL
	fetchedAt := time.Now()
	var duration time.Duration
	if pageResult != nil {
		statusCode = pageResult.StatusCode
		finalURL = pageResult.FinalURL
		fetchedAt = pageResult.FetchedAt
		duration = pageResult.Duration
	}

	outcome := fetcher.ClassifyOutcome(fetchErr, statusCode)
	if outcome != fetcher.OutcomeOK {
		writeOutcome(w, req.URL, finalURL, statusCode, ua, outcome, fetchedAt, duration)
		return
	}

	facts, err := parser.Parse(pageResult, req.URL)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not parse page HTML")
		return
	}

	findings := report.Sort(registry.Run(facts))

	resp := auditResponse{
		URL:        facts.URL,
		FinalURL:   facts.FinalURL,
		StatusCode: facts.StatusCode,
		UserAgent:  ua.Name,
		FetchedAt:  facts.FetchedAt,
		DurationMs: facts.Duration.Milliseconds(),
		Outcome:    string(fetcher.OutcomeOK),
		Summary:    report.Summarize(findings),
		Facts: &auditFacts{
			Title:       facts.Title,
			Description: facts.Description,
			Canonical:   facts.Canonical,
			Robots:      facts.Robots,
		},
		Findings: toFindingDTOs(findings),
	}

	writeJSON(w, http.StatusOK, resp)
}

// writeOutcome responds with a report describing why content analysis was
// skipped, rather than a partial or misleading set of findings.
func writeOutcome(
	w http.ResponseWriter,
	requestedURL, finalURL string,
	statusCode int,
	ua fetcher.UserAgent,
	outcome fetcher.Outcome,
	fetchedAt time.Time,
	duration time.Duration,
) {
	resp := auditResponse{
		URL:            requestedURL,
		FinalURL:       finalURL,
		StatusCode:     statusCode,
		UserAgent:      ua.Name,
		FetchedAt:      fetchedAt,
		DurationMs:     duration.Milliseconds(),
		Outcome:        string(outcome),
		OutcomeMessage: outcomeMessage(outcome, statusCode),
		Findings:       []findingDTO{},
	}
	writeJSON(w, http.StatusOK, resp)
}

func outcomeMessage(outcome fetcher.Outcome, statusCode int) string {
	switch outcome {
	case fetcher.OutcomeBlockedByRobots:
		return "robots.txt disallows this path for the selected user-agent. We didn't fetch the page, out of respect for that rule — content checks were skipped."
	case fetcher.OutcomeBlockedByServer:
		return httpStatusMessage(statusCode) + " This usually means the site is blocking automated requests, not that the page itself has a problem. Content checks were skipped because the real HTML wasn't available."
	case fetcher.OutcomeHTTPError:
		return httpStatusMessage(statusCode) + " Content checks were skipped since this isn't a successful response."
	case fetcher.OutcomeRedirectIssue:
		return "This URL redirected too many times without reaching a final page. Content checks were skipped."
	case fetcher.OutcomeTimeout:
		return "The request timed out or the connection failed before a response came back. Content checks were skipped."
	case fetcher.OutcomeDNSError:
		return "The domain name could not be resolved. Content checks were skipped."
	default:
		return "Content checks were skipped."
	}
}

func httpStatusMessage(statusCode int) string {
	if statusCode == 0 {
		return "The page could not be fetched."
	}
	return "Server responded with status " + strconv.Itoa(statusCode) + "."
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

func validationErrorResponse(err error) (int, string) {
	switch {
	case errors.Is(err, fetcher.ErrInvalidURL), errors.Is(err, fetcher.ErrSchemeNotAllowed):
		return http.StatusBadRequest, "invalid URL"
	case errors.Is(err, fetcher.ErrPrivateAddress):
		return http.StatusBadRequest, "URL resolves to a private or reserved address"
	case errors.Is(err, fetcher.ErrDNSFailed):
		return http.StatusBadRequest, "could not resolve host"
	default:
		return http.StatusBadRequest, "invalid URL"
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
