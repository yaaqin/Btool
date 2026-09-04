package handler

import (
	"net/http"

	"github.com/yaaqin/builder-tool/internal/ratelimit"
)

// NewRouter wires up all HTTP routes for the API, rate-limited per IP.
func NewRouter(limiter *ratelimit.Limiter) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", HealthCheck)
	return limiter.Middleware(mux)
}
