package fetcher

// UserAgent bundles the HTTP header we send with the product token used to
// pick a robots.txt group. They must agree — claiming to be Googlebot in
// the HTTP header while matching robots.txt as "*" would defeat the point
// of choosing a user-agent at all.
type UserAgent struct {
	Name        string
	HTTPHeader  string
	RobotsToken string
}

var (
	// UAGooglebot answers "can Google crawl this?" — the question most
	// users actually want answered, since Googlebot often gets a more
	// permissive robots.txt group than everyone else.
	UAGooglebot = UserAgent{
		Name:        "googlebot",
		HTTPHeader:  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		RobotsToken: "googlebot",
	}

	// UAGeneric answers "what can I, a generic bot, see?" — useful when a
	// site special-cases Googlebot but blocks everything else.
	UAGeneric = UserAgent{
		Name:        "generic",
		HTTPHeader:  "SEOAuditBot/0.1 (+https://github.com/yaaqin/builder-tool)",
		RobotsToken: "seoauditbot",
	}
)

// ResolveUserAgent maps the request's user_agent field to a UserAgent,
// defaulting to Googlebot for an empty or unrecognized value.
func ResolveUserAgent(name string) UserAgent {
	if name == UAGeneric.Name {
		return UAGeneric
	}
	return UAGooglebot
}
