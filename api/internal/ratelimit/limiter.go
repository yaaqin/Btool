// Package ratelimit implements a per-key (per-IP) sliding-window request
// limiter, used to cap how many audits a single IP can run in a given
// window.
package ratelimit

import (
	"sync"
	"time"
)

// Limiter tracks recent hit timestamps per key in memory. It resets on
// process restart and is not shared across instances — sufficient for a
// single-instance deployment, not for a horizontally scaled one.
type Limiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[string][]time.Time
}

func New(cfg Config) *Limiter {
	l := &Limiter{
		max:    cfg.Max,
		window: cfg.Window,
		hits:   make(map[string][]time.Time),
	}
	go l.janitor()
	return l
}

// Allow reports whether key has made fewer than max hits within the
// trailing window, and records this attempt if so.
func (l *Limiter) Allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	kept := recentHits(l.hits[key], cutoff)
	if len(kept) >= l.max {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

// janitor periodically drops keys with no hits left inside the window, so
// long-running processes don't accumulate an entry per IP forever.
func (l *Limiter) janitor() {
	ticker := time.NewTicker(l.window)
	defer ticker.Stop()

	for now := range ticker.C {
		cutoff := now.Add(-l.window)

		l.mu.Lock()
		for key, hits := range l.hits {
			kept := recentHits(hits, cutoff)
			if len(kept) == 0 {
				delete(l.hits, key)
			} else {
				l.hits[key] = kept
			}
		}
		l.mu.Unlock()
	}
}

// recentHits filters hits to those after cutoff, reusing hits' backing
// array since every kept index is <= its source index.
func recentHits(hits []time.Time, cutoff time.Time) []time.Time {
	kept := hits[:0]
	for _, t := range hits {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	return kept
}
