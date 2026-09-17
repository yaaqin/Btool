package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/yaaqin/builder-tool/internal/fetcher"
	"github.com/yaaqin/builder-tool/internal/parser"
)

type metadataRequest struct {
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
}

type metaTagDTO struct {
	Tag   string `json:"tag"`
	Value string `json:"value"`
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
	Tags           []metaTagDTO `json:"tags,omitempty"`
	H1s            []string     `json:"h1s"`
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
		URL:        req.URL,
		FinalURL:   fo.FinalURL,
		StatusCode: fo.StatusCode,
		UserAgent:  ua.Name,
		FetchedAt:  fo.FetchedAt,
		DurationMs: fo.Duration.Milliseconds(),
		Outcome:    string(fetcher.OutcomeOK),
		Tags:       toMetaTagDTOs(meta.Tags),
		H1s:        nonNilStrings(meta.H1s),
	}
	writeJSON(w, http.StatusOK, resp)
}

func toMetaTagDTOs(tags []parser.MetaTag) []metaTagDTO {
	out := make([]metaTagDTO, len(tags))
	for i, t := range tags {
		out[i] = metaTagDTO{Tag: t.Tag, Value: t.Value}
	}
	return out
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
		H1s:            []string{},
	}
	writeJSON(w, http.StatusOK, resp)
}
