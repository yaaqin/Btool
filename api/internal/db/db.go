// Package db manages the Postgres connection pool. It's optional — the
// audit flow doesn't need one, and the API runs fine without DATABASE_URL
// set. Once a feature that needs persistence exists (audit history,
// permalinks — see prd.md fase 3), it depends on Connect having succeeded.
package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pool against databaseURL and verifies it with a ping,
// so a misconfigured DSN fails at startup instead of on the first query.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
