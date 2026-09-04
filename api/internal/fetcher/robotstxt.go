package fetcher

import (
	"context"
	"net/url"
	"strings"
)

type RobotsTxtInfo struct {
	Fetched  bool
	Disallow []string
}

// FetchRobotsTxt retrieves /robots.txt for the same host as pageURL.
// Absence or a fetch failure is not an error — it just means there's
// nothing to enforce, which is reported as an Info-level finding rather
// than failing the whole audit.
func FetchRobotsTxt(ctx context.Context, pageURL string) *RobotsTxtInfo {
	u, err := url.Parse(pageURL)
	if err != nil {
		return &RobotsTxtInfo{}
	}

	robotsURL := (&url.URL{Scheme: u.Scheme, Host: u.Host, Path: "/robots.txt"}).String()

	res, err := Fetch(ctx, robotsURL)
	if err != nil || res.StatusCode != 200 {
		return &RobotsTxtInfo{}
	}

	return &RobotsTxtInfo{
		Fetched:  true,
		Disallow: parseDisallowAll(string(res.Body)),
	}
}

// parseDisallowAll extracts Disallow rules from the User-agent: * group.
// This is a minimal parser: no wildcards, no Allow overrides, no per-bot
// groups. Good enough to catch "whole site blocked" and "this path
// blocked" without pulling in a full robots.txt parser dependency.
func parseDisallowAll(body string) []string {
	var disallow []string
	applies := false

	for _, line := range strings.Split(body, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		key, value, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)

		switch key {
		case "user-agent":
			applies = value == "*"
		case "disallow":
			if applies && value != "" {
				disallow = append(disallow, value)
			}
		}
	}

	return disallow
}

// Blocks reports whether path is disallowed, using the robots.txt spec's
// simple longest-prefix-match rule (without the wildcard extensions some
// crawlers support).
func (r *RobotsTxtInfo) Blocks(path string) bool {
	if r == nil {
		return false
	}
	for _, rule := range r.Disallow {
		if strings.HasPrefix(path, rule) {
			return true
		}
	}
	return false
}
