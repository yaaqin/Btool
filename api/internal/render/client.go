// Package render talks to the render service (render-service/, Node +
// Playwright), which loads a page in headless Chromium, lets its
// JavaScript run, and hands back the serialized DOM. It lives in its own
// process because rendering needs a browser and far more RAM than a raw
// fetch — see fsd.md §1.
package render

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Timeout bounds one render, from request to parsed response. The render
// service enforces its own, slightly shorter deadline so it can still
// answer with a useful error before this one fires.
const Timeout = 30 * time.Second

// maxResponseBytes caps the render service's response (the DOM plus a
// little JSON) the same way fetcher.MaxBodyBytes caps a raw fetch.
const maxResponseBytes = 6 << 20

// ErrDisabled is returned when RENDER_SERVICE_URL isn't set, so callers
// can tell "rendering is off here" apart from "rendering failed".
var ErrDisabled = errors.New("render service not configured")

// ServiceError is a failure the render service itself reported (the page
// timed out, navigation was blocked, ...). Its message is written by our
// own service, so unlike transport errors it's safe to show to users.
type ServiceError struct{ Msg string }

func (e *ServiceError) Error() string { return e.Msg }

type Result struct {
	FinalURL   string
	StatusCode int
	HTML       string
	Duration   time.Duration
}

type renderRequest struct {
	URL       string `json:"url"`
	UserAgent string `json:"user_agent"`
}

type renderResponse struct {
	FinalURL   string `json:"final_url"`
	StatusCode int    `json:"status_code"`
	HTML       string `json:"html"`
	Error      string `json:"error"`
}

// Render asks the render service to load pageURL with userAgentHeader and
// returns the DOM as it stands once the network has gone idle (or the
// service's deadline hits). The service re-validates every request the
// browser makes against private addresses, same as fetcher.ValidateURL.
func Render(ctx context.Context, pageURL, userAgentHeader string) (*Result, error) {
	base := strings.TrimRight(os.Getenv("RENDER_SERVICE_URL"), "/")
	if base == "" {
		return nil, ErrDisabled
	}

	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()

	body, err := json.Marshal(renderRequest{URL: pageURL, UserAgent: userAgentHeader})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+"/render", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	started := time.Now()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rr renderResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseBytes)).Decode(&rr); err != nil {
		return nil, fmt.Errorf("render service: undecodable response (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		if rr.Error == "" {
			return nil, fmt.Errorf("render service: HTTP %d", resp.StatusCode)
		}
		return nil, &ServiceError{Msg: rr.Error}
	}

	return &Result{
		FinalURL:   rr.FinalURL,
		StatusCode: rr.StatusCode,
		HTML:       rr.HTML,
		Duration:   time.Since(started),
	}, nil
}
