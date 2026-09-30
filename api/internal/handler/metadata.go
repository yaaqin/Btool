package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/yaaqin/builder-tool/internal/fetcher"
	"github.com/yaaqin/builder-tool/internal/parser"
	"github.com/yaaqin/builder-tool/internal/render"
)

type metadataRequest struct {
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
}

type metaTagDTO struct {
	Tag   string `json:"tag"`
	Value string `json:"value"`
	// Issue flags a tag that's present but not usable as-is — see
	// metaTagIssues. Empty means nothing to flag (including plain absence).
	Issue string `json:"issue,omitempty"`
}

// Issue codes for metaTagDTO.Issue. The frontend maps each to a message.
const (
	issueIncomplete    = "incomplete"      // companion tags set, main tag empty
	issueInvalidJSONLD = "invalid_json_ld" // a JSON-LD block didn't parse
)

// renderedDTO is the same page after JavaScript ran, extracted with the
// same parser as the raw HTML so the two can be compared row by row.
type renderedDTO struct {
	Status     string       `json:"status"` // "ok" | "disabled" | "failed"
	Error      string       `json:"error,omitempty"`
	FinalURL   string       `json:"final_url,omitempty"`
	StatusCode int          `json:"status_code,omitempty"`
	DurationMs int64        `json:"duration_ms,omitempty"`
	Tags       []metaTagDTO `json:"tags,omitempty"`
	H1s        []string     `json:"h1s"`
}

type metadataResponse struct {
	URL            string       `json:"url"`
	FinalURL       string       `json:"final_url"`
	StatusCode     int          `json:"status_code,omitempty"`
	UserAgent      string       `json:"user_agent"`
	FetchedAt      time.Time    `json:"fetched_at"`
	DurationMs     int64        `json:"duration_ms"`
	Outcome        string       `json:"outcome"`
	OutcomeMessage string       `json:"outcome_message,omitempty"`
	RedirectHops   []string     `json:"redirect_hops"`
	XRobotsTag     []string     `json:"x_robots_tag"`
	Tags           []metaTagDTO `json:"tags,omitempty"`
	H1s            []string     `json:"h1s"`
	Rendered       *renderedDTO `json:"rendered,omitempty"`
}

// CreateMetadataReport handles POST /api/v1/metadata. It shares the fetch
// pipeline with CreateAudit (see fetchPage) but doesn't run content rules
// — this endpoint answers "what metadata tags and H1s are on this page",
// not "is any of it a problem".
func CreateMetadataReport(w http.ResponseWriter, r *http.Request) {
	var req metadataRequest
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

	fo := fetchPage(ctx, req.URL, parsedURL.Path, ua)
	if fo.Outcome != fetcher.OutcomeOK {
		writeMetadataOutcome(w, req.URL, fo.FinalURL, fo.StatusCode, ua, fo.Outcome, fo.FetchedAt, fo.Duration)
		return
	}

	meta, err := parser.ExtractMetadata(fo.Result, fo.FinalURL)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not parse page HTML")
		return
	}

	resp := metadataResponse{
		URL:          req.URL,
		FinalURL:     fo.FinalURL,
		StatusCode:   fo.StatusCode,
		UserAgent:    ua.Name,
		FetchedAt:    fo.FetchedAt,
		DurationMs:   fo.Duration.Milliseconds(),
		Outcome:      string(fetcher.OutcomeOK),
		RedirectHops: nonNilStrings(fo.Result.RedirectHops),
		XRobotsTag:   nonNilStrings(fo.Result.XRobotsTag),
		Tags:         toMetaTagDTOs(meta),
		H1s:          nonNilStrings(meta.H1s),
		// Rendering gets its own deadline: it's far slower than the raw
		// fetch and shouldn't eat into (or be cut short by) that budget.
		Rendered: renderMetadata(r.Context(), req.URL, ua),
	}
	writeJSON(w, http.StatusOK, resp)
}

// renderMetadata runs the page through the render service and extracts
// the same metadata from the resulting DOM. It never fails the request —
// the raw column stands on its own — so every problem ends up in Status.
func renderMetadata(ctx context.Context, pageURL string, ua fetcher.UserAgent) *renderedDTO {
	res, err := render.Render(ctx, pageURL, ua.HTTPHeader)
	if err != nil {
		out := &renderedDTO{Status: "failed", H1s: []string{}}
		var svcErr *render.ServiceError
		switch {
		case errors.Is(err, render.ErrDisabled):
			out.Status = "disabled"
		case errors.As(err, &svcErr):
			out.Error = svcErr.Msg
		case errors.Is(err, context.DeadlineExceeded):
			out.Error = "timed out waiting for the page to render"
		default:
			// Transport errors can name internal hosts — log, don't echo.
			log.Printf("render %s: %v", pageURL, err)
			out.Error = "render service unavailable"
		}
		return out
	}

	meta, err := parser.ExtractMetadataFromHTML(res.HTML, res.FinalURL)
	if err != nil {
		return &renderedDTO{Status: "failed", Error: "could not parse rendered HTML", H1s: []string{}}
	}
	return &renderedDTO{
		Status:     "ok",
		FinalURL:   res.FinalURL,
		StatusCode: res.StatusCode,
		DurationMs: res.Duration.Milliseconds(),
		Tags:       toMetaTagDTOs(meta),
		H1s:        nonNilStrings(meta.H1s),
	}
}

func toMetaTagDTOs(meta *parser.MetadataResult) []metaTagDTO {
	out := make([]metaTagDTO, len(meta.Tags))
	for i, t := range meta.Tags {
		out[i] = metaTagDTO{Tag: t.Tag, Value: t.Value}
	}
	for i, issue := range metaTagIssues(meta) {
		out[i].Issue = issue
	}
	return out
}

// incompleteGroups maps a tag to its companion tags. Companions without
// the tag itself are a half-finished setup — og:image:width is useless
// with no og:image — which deserves a warning, not just an empty cell.
var incompleteGroups = map[string][]string{
	"og:image": {"og:image:type", "og:image:width", "og:image:height", "og:image:alt"},
}

// metaTagIssues returns an issue code per tag index (only flagged ones).
func metaTagIssues(meta *parser.MetadataResult) map[int]string {
	values := make(map[string]string, len(meta.Tags))
	for _, t := range meta.Tags {
		values[t.Tag] = t.Value
	}

	issues := map[int]string{}
	for i, t := range meta.Tags {
		if t.Tag == "json-ld" && meta.InvalidJSONLD > 0 {
			issues[i] = issueInvalidJSONLD
			continue
		}
		if t.Value != "" {
			continue
		}
		for _, companion := range incompleteGroups[t.Tag] {
			if values[companion] != "" {
				issues[i] = issueIncomplete
				break
			}
		}
	}
	return issues
}

// nonNilStrings keeps the h1s field a JSON array ([]) instead of null when
// a page has no H1s, since the frontend switches on its length.
func nonNilStrings(in []string) []string {
	if in == nil {
		return []string{}
	}
	return in
}

func writeMetadataOutcome(
	w http.ResponseWriter,
	requestedURL, finalURL string,
	statusCode int,
	ua fetcher.UserAgent,
	outcome fetcher.Outcome,
	fetchedAt time.Time,
	duration time.Duration,
) {
	resp := metadataResponse{
		URL:            requestedURL,
		FinalURL:       finalURL,
		StatusCode:     statusCode,
		UserAgent:      ua.Name,
		FetchedAt:      fetchedAt,
		DurationMs:     duration.Milliseconds(),
		Outcome:        string(outcome),
		OutcomeMessage: outcomeMessage(outcome, statusCode),
		RedirectHops:   []string{},
		XRobotsTag:     []string{},
		H1s:            []string{},
	}
	writeJSON(w, http.StatusOK, resp)
}
