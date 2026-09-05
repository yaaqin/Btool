package fetcher

import (
	"context"
	"net/url"
	"regexp"
	"strings"
)

type robotsRule struct {
	pattern string // original pattern, used for specificity (longest wins)
	allow   bool
	re      *regexp.Regexp
}

type robotsGroup struct {
	userAgents []string // lowercased tokens, e.g. "*", "googlebot"
	rules      []robotsRule
}

type RobotsTxtInfo struct {
	Fetched bool
	groups  []robotsGroup
}

// FetchRobotsTxt retrieves /robots.txt for the same host as pageURL.
// Absence or a fetch failure is not an error — per the spec, a missing
// robots.txt means everything is allowed.
func FetchRobotsTxt(ctx context.Context, pageURL string, userAgentHeader string) *RobotsTxtInfo {
	u, err := url.Parse(pageURL)
	if err != nil {
		return &RobotsTxtInfo{}
	}

	robotsURL := (&url.URL{Scheme: u.Scheme, Host: u.Host, Path: "/robots.txt"}).String()

	res, err := Fetch(ctx, robotsURL, userAgentHeader)
	if err != nil || res.StatusCode != 200 {
		return &RobotsTxtInfo{}
	}

	return &RobotsTxtInfo{
		Fetched: true,
		groups:  parseGroups(string(res.Body)),
	}
}

// parseGroups splits robots.txt into records per the spec's grouping rule:
// consecutive User-agent lines share the rules that follow them, and a
// User-agent line after a rule starts a new group.
func parseGroups(body string) []robotsGroup {
	var groups []robotsGroup
	var current *robotsGroup
	seenRuleInCurrent := false

	for _, rawLine := range strings.Split(body, "\n") {
		line := stripComment(rawLine)
		key, value, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)

		switch key {
		case "user-agent":
			if current == nil || seenRuleInCurrent {
				groups = append(groups, robotsGroup{})
				current = &groups[len(groups)-1]
				seenRuleInCurrent = false
			}
			current.userAgents = append(current.userAgents, strings.ToLower(value))
		case "disallow":
			if current != nil && value != "" {
				current.rules = append(current.rules, compileRule(value, false))
				seenRuleInCurrent = true
			}
		case "allow":
			if current != nil && value != "" {
				current.rules = append(current.rules, compileRule(value, true))
				seenRuleInCurrent = true
			}
		}
	}

	return groups
}

func stripComment(line string) string {
	if i := strings.Index(line, "#"); i >= 0 {
		line = line[:i]
	}
	return strings.TrimSpace(line)
}

// compileRule turns a robots.txt path pattern into a regexp: "*" becomes a
// wildcard, a trailing "$" anchors the end, everything else is literal.
func compileRule(pattern string, allow bool) robotsRule {
	anchored := strings.HasSuffix(pattern, "$")
	body := strings.TrimSuffix(pattern, "$")

	segments := strings.Split(body, "*")
	for i, s := range segments {
		segments[i] = regexp.QuoteMeta(s)
	}
	reStr := "^" + strings.Join(segments, ".*")
	if anchored {
		reStr += "$"
	}

	re, err := regexp.Compile(reStr)
	if err != nil {
		re = nil
	}

	return robotsRule{pattern: pattern, allow: allow, re: re}
}

// Allowed reports whether path is crawlable by the given robots.txt
// product token (e.g. "googlebot"). A missing robots.txt, or no group at
// all matching the token, means allowed.
func (r *RobotsTxtInfo) Allowed(path string, productToken string) bool {
	if r == nil || !r.Fetched {
		return true
	}

	group := selectGroup(r.groups, productToken)
	if group == nil {
		return true
	}

	allow, matched := group.match(path)
	if !matched {
		return true
	}
	return allow
}

// selectGroup picks the most specific group for productToken. If any
// named (non "*") group matches, the "*" group is ignored entirely — a
// site that has bothered to write a Googlebot-specific group doesn't want
// it diluted by the generic one.
func selectGroup(groups []robotsGroup, productToken string) *robotsGroup {
	token := strings.ToLower(productToken)

	var wildcard *robotsGroup
	var best *robotsGroup
	bestLen := -1

	for i := range groups {
		g := &groups[i]
		for _, ua := range g.userAgents {
			if ua == "*" {
				if wildcard == nil {
					wildcard = g
				}
				continue
			}
			if strings.HasPrefix(token, ua) && len(ua) > bestLen {
				bestLen = len(ua)
				best = g
			}
		}
	}

	if best != nil {
		return best
	}
	return wildcard
}

// match finds the rule with the longest matching pattern, Allow winning
// ties, per the spec's "most specific rule wins" tie-break.
func (g *robotsGroup) match(path string) (allow bool, matched bool) {
	bestLen := -1
	var bestAllow bool

	for _, rule := range g.rules {
		if rule.re == nil || !rule.re.MatchString(path) {
			continue
		}
		if len(rule.pattern) > bestLen || (len(rule.pattern) == bestLen && rule.allow && !bestAllow) {
			bestLen = len(rule.pattern)
			bestAllow = rule.allow
			matched = true
		}
	}

	return bestAllow, matched
}
