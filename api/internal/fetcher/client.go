package fetcher

import (
	"context"
	"errors"
	"io"
	"net/http"
	"time"
)

const (
	// Timeout bounds the whole request, including redirects.
	Timeout = 10 * time.Second
	// MaxBodyBytes caps how much of the response body we read, so a huge
	// or slow-drip response can't exhaust memory.
	MaxBodyBytes = 5 << 20 // 5 MB
	maxRedirects = 5
	userAgent    = "SEOAuditBot/0.1 (+https://github.com/yaaqin/builder-tool)"
)

var ErrTooManyRedirects = errors.New("too many redirects")

type FetchResult struct {
	FinalURL     string
	StatusCode   int
	RedirectHops []string
	Body         []byte
	FetchedAt    time.Time
	Duration     time.Duration
}

// Fetch validates rawURL, performs the HTTP GET, and returns the body
// capped at MaxBodyBytes along with the final URL and redirect chain. Every
// redirect hop is re-validated (see ValidateURL) so a public URL can't
// redirect its way into a private address.
func Fetch(ctx context.Context, rawURL string) (*FetchResult, error) {
	if _, err := ValidateURL(rawURL); err != nil {
		return nil, err
	}

	var hops []string
	client := &http.Client{
		Timeout: Timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return ErrTooManyRedirects
			}
			if _, err := ValidateURL(req.URL.String()); err != nil {
				return err
			}
			hops = append(hops, req.URL.String())
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)

	fetchedAt := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, MaxBodyBytes))
	if err != nil {
		return nil, err
	}

	return &FetchResult{
		FinalURL:     resp.Request.URL.String(),
		StatusCode:   resp.StatusCode,
		RedirectHops: hops,
		Body:         body,
		FetchedAt:    fetchedAt,
		Duration:     time.Since(fetchedAt),
	}, nil
}
