package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/yaaqin/builder-tool/internal/db"
	"github.com/yaaqin/builder-tool/internal/handler"
	"github.com/yaaqin/builder-tool/internal/ratelimit"
)

const defaultPort = "9721"

func main() {
	// Missing .env is fine — real deployments set env vars directly.
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	limiter := ratelimit.New(ratelimit.ConfigFromEnv())

	pool := connectDB()
	if pool != nil {
		defer pool.Close()
	}

	addr := ":" + port
	log.Printf("api listening on %s", addr)
	if err := http.ListenAndServe(addr, handler.NewRouter(limiter, pool)); err != nil {
		log.Fatal(err)
	}
}

// connectDB is a no-op returning nil when DATABASE_URL isn't set — the
// audit flow doesn't need a database. If it is set, a failed connection
// is treated as a misconfiguration and fails startup immediately.
func connectDB() *pgxpool.Pool {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("DATABASE_URL not set, running without a database")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		log.Fatalf("DATABASE_URL is set but connecting failed: %v", err)
	}

	log.Println("connected to database")
	return pool
}
