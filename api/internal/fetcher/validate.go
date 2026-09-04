package fetcher

import (
	"errors"
	"net"
	"net/url"
)

var (
	ErrInvalidURL       = errors.New("invalid URL")
	ErrSchemeNotAllowed = errors.New("only http and https URLs are allowed")
	ErrDNSFailed        = errors.New("could not resolve host")
	ErrPrivateAddress   = errors.New("URL resolves to a private or reserved address")
)

// ValidateURL rejects anything that isn't a public http(s) URL, to prevent
// SSRF against internal services (localhost, cloud metadata endpoints,
// etc). Called both before the initial request and on every redirect hop.
func ValidateURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, ErrInvalidURL
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, ErrSchemeNotAllowed
	}
	if u.Hostname() == "" {
		return nil, ErrInvalidURL
	}

	ips, err := net.LookupIP(u.Hostname())
	if err != nil {
		return nil, ErrDNSFailed
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return nil, ErrPrivateAddress
		}
	}
	return u, nil
}

func isBlockedIP(ip net.IP) bool {
	return ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() ||
		ip.Equal(net.IPv4bcast)
}
