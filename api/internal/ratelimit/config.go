package ratelimit

import (
	"os"
	"strconv"
	"time"
)

const (
	defaultMax    = 3
	defaultWindow = 4 * time.Hour
)

// Config holds the limit and window, overridable via env so ops can raise
// or lower the quota without a code change or rebuild.
type Config struct {
	Max    int
	Window time.Duration
}

// ConfigFromEnv reads RATE_LIMIT_MAX and RATE_LIMIT_WINDOW, falling back to
// 3 requests per 4 hours when unset or invalid.
func ConfigFromEnv() Config {
	cfg := Config{Max: defaultMax, Window: defaultWindow}

	if v := os.Getenv("RATE_LIMIT_MAX"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.Max = n
		}
	}

	if v := os.Getenv("RATE_LIMIT_WINDOW"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			cfg.Window = d
		}
	}

	return cfg
}
