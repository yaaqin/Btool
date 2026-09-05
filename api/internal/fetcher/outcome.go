package fetcher

import (
	"errors"
	"net"
)

// Outcome classifies whether a fetch produced usable HTML. Content
// analysis must only run when Outcome is OK — everything else means the
// body we got (if any) isn't the real page, so title/description/etc
// checks would just be reporting on garbage. See the blocked-page bug
// report: LinkedIn's anti-bot response was misread as "no title, no
// description", which is worse than not checking at all.
type Outcome string

const (
	OutcomeOK              Outcome = "ok"
	OutcomeBlockedByRobots Outcome = "blocked_by_robots"
	OutcomeBlockedByServer Outcome = "blocked_by_server"
	OutcomeHTTPError       Outcome = "http_error"
	OutcomeRedirectIssue   Outcome = "redirect_issue"
	OutcomeTimeout         Outcome = "timeout"
	OutcomeDNSError        Outcome = "dns_error"
)

// blockedStatusCodes are non-2xx statuses commonly used to reject
// automated clients rather than to signal a real page-level error. 999 is
// LinkedIn's own non-standard anti-scraping status.
var blockedStatusCodes = map[int]bool{
	999: true,
	403: true,
	429: true,
}

// ClassifyOutcome turns a fetch error (or successful status code) into an
// Outcome. err is checked first since a non-nil err means statusCode isn't
// meaningful (the request never got a response).
func ClassifyOutcome(err error, statusCode int) Outcome {
	if err != nil {
		switch {
		case errors.Is(err, ErrTooManyRedirects):
			return OutcomeRedirectIssue
		case errors.Is(err, ErrDNSFailed):
			return OutcomeDNSError
		}

		var dnsErr *net.DNSError
		if errors.As(err, &dnsErr) {
			return OutcomeDNSError
		}

		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			return OutcomeTimeout
		}

		// Connection refused, TLS failure, and similar: we couldn't talk
		// to the host at all, which reads the same as a timeout to a
		// user deciding what to do next.
		return OutcomeTimeout
	}

	switch {
	case blockedStatusCodes[statusCode]:
		return OutcomeBlockedByServer
	case statusCode >= 200 && statusCode < 300:
		return OutcomeOK
	default:
		return OutcomeHTTPError
	}
}
