package ratelimit

import (
	"testing"
	"time"
)

func TestConfigFromEnvDefaults(t *testing.T) {
	cfg := ConfigFromEnv()

	if cfg.Max != 3 {
		t.Errorf("Max = %d, want 3", cfg.Max)
	}
	if cfg.Window != 4*time.Hour {
		t.Errorf("Window = %s, want 4h", cfg.Window)
	}
}

func TestConfigFromEnvOverride(t *testing.T) {
	t.Setenv("RATE_LIMIT_MAX", "10")
	t.Setenv("RATE_LIMIT_WINDOW", "30m")

	cfg := ConfigFromEnv()

	if cfg.Max != 10 {
		t.Errorf("Max = %d, want 10", cfg.Max)
	}
	if cfg.Window != 30*time.Minute {
		t.Errorf("Window = %s, want 30m", cfg.Window)
	}
}

func TestConfigFromEnvIgnoresInvalidValues(t *testing.T) {
	t.Setenv("RATE_LIMIT_MAX", "not-a-number")
	t.Setenv("RATE_LIMIT_WINDOW", "not-a-duration")

	cfg := ConfigFromEnv()

	if cfg.Max != 3 {
		t.Errorf("Max = %d, want default 3", cfg.Max)
	}
	if cfg.Window != 4*time.Hour {
		t.Errorf("Window = %s, want default 4h", cfg.Window)
	}
}
