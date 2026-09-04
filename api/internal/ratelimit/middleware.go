package ratelimit

import (
	"net"
	"net/http"
	"strconv"
	"strings"
)

// Middleware rejects requests over the limit with 429, keyed by ClientIP.
func (l *Limiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.Allow(ClientIP(r)) {
			w.Header().Set("Retry-After", strconv.Itoa(int(l.window.Seconds())))
			http.Error(w, "rate limit exceeded, try again later", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ClientIP prefers the standard proxy headers over RemoteAddr, since the
// API will typically sit behind a reverse proxy or load balancer.
func ClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		first, _, _ := strings.Cut(fwd, ",")
		return strings.TrimSpace(first)
	}
	if rip := r.Header.Get("X-Real-IP"); rip != "" {
		return rip
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
