package main

import (
	"log"
	"net/http"
	"os"

	"github.com/yaaqin/builder-tool/internal/handler"
)

const defaultPort = "9721"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	addr := ":" + port
	log.Printf("api listening on %s", addr)
	if err := http.ListenAndServe(addr, handler.NewRouter()); err != nil {
		log.Fatal(err)
	}
}
