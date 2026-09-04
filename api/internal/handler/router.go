package handler

import "net/http"

// NewRouter wires up all HTTP routes for the API.
func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", HealthCheck)
	return mux
}
