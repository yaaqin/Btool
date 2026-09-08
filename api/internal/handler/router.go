package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/yaaqin/builder-tool/internal/ratelimit"
)

// NewRouter wires up all HTTP routes for the API, rate-limited per IP.
// pool may be nil — see HealthCheck.
func NewRouter(limiter *ratelimit.Limiter, pool *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", HealthCheck(pool))
	mux.HandleFunc("POST /api/v1/audits", CreateAudit)
	return withCORS(limiter.Middleware(mux))
}
