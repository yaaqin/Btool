package fetcher

import "testing"

// parseAndCheck mirrors what FetchRobotsTxt would produce for a
// successfully-fetched body, without needing a real HTTP round trip.
func parseAndCheck(t *testing.T, body, productToken, path string) bool {
	t.Helper()
	info := &RobotsTxtInfo{Fetched: true, groups: parseGroups(body)}
	return info.Allowed(path, productToken)
}

func TestRobotsTxt_SpecificGroupBeatsWildcard(t *testing.T) {
	body := `
User-agent: *
Disallow: /in/

User-agent: Googlebot
Allow: /in/
`
	if !parseAndCheck(t, body, "googlebot", "/in/yaaqin/") {
		t.Error("googlebot should be allowed on /in/yaaqin/")
	}
	if parseAndCheck(t, body, "seoauditbot", "/in/yaaqin/") {
		t.Error("generic bot should be disallowed on /in/yaaqin/")
	}
}

func TestRobotsTxt_LongestMatchWins(t *testing.T) {
	body := `
User-agent: *
Disallow: /blog/
Allow: /blog/public/
`
	if parseAndCheck(t, body, "seoauditbot", "/blog/draft/") {
		t.Error("/blog/draft/ should be disallowed")
	}
	if !parseAndCheck(t, body, "seoauditbot", "/blog/public/a") {
		t.Error("/blog/public/a should be allowed (longer, more specific match)")
	}
}

func TestRobotsTxt_WildcardAndEndAnchor(t *testing.T) {
	body := `
User-agent: *
Disallow: /*.pdf$
`
	if parseAndCheck(t, body, "seoauditbot", "/docs/file.pdf") {
		t.Error("/docs/file.pdf should be disallowed")
	}
	if !parseAndCheck(t, body, "seoauditbot", "/docs/file.pdf?v=2") {
		t.Error("/docs/file.pdf?v=2 should be allowed ($ anchors the literal end)")
	}
}

func TestRobotsTxt_EmptyDisallowAllowsEverything(t *testing.T) {
	body := `
User-agent: *
Disallow:
`
	if !parseAndCheck(t, body, "seoauditbot", "/anything/at/all") {
		t.Error("empty Disallow should allow every path")
	}
}

func TestRobotsTxt_MissingFileAllowsEverything(t *testing.T) {
	info := &RobotsTxtInfo{Fetched: false}
	if !info.Allowed("/anything", "seoauditbot") {
		t.Error("a missing robots.txt should allow every path")
	}
}
