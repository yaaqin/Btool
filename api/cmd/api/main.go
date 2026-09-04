package main

import (
	"log"
	"net/http"
	"os"

	"github.com/yaaqin/builder-tool/internal/handler"
	"github.com/yaaqin/builder-tool/internal/ratelimit"
)

const defaultPort = "9721"

func main() {
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
