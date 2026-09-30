package handler

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/yaaqin/builder-tool/internal/auth"
	"github.com/yaaqin/builder-tool/internal/ratelimit"
)

// loginAttempts caps password guesses per IP on the metadata login.
var loginAttempts = ratelimit.Config{Max: 5, Window: 15 * time.Minute}

// NewRouter wires up all HTTP routes for the API. Public routes are
// rate-limited per IP; the metadata report sits behind gate's password
// instead — it drives a headless browser, too costly to leave open, and
// once unlocked it's the owner using it, so no quota on top.
// pool may be nil — see HealthCheck.
func NewRouter(limiter *ratelimit.Limiter, gate *auth.Gate, pool *pgxpool.Pool) http.Handler {
	loginLimiter := ratelimit.New(loginAttempts)

	mux := http.NewServeMux()
	mux.Handle("GET /healthz", limiter.Middleware(HealthCheck(pool)))
	mux.Handle("POST /api/v1/audits", limiter.Middleware(http.HandlerFunc(CreateAudit)))
	mux.Handle("POST /api/v1/metadata/login", loginLimiter.Middleware(MetadataLogin(gate)))
	mux.Handle("POST /api/v1/metadata", gate.Require(http.HandlerFunc(CreateMetadataReport)))
	return withCORS(mux)
}
