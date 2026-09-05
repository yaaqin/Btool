package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

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

	addr := ":" + port
	log.Printf("api listening on %s", addr)
	if err := http.ListenAndServe(addr, handler.NewRouter(limiter)); err != nil {
		log.Fatal(err)
	}
}
