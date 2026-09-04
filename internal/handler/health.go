package handler

import (
	"encoding/json"
	"net/http"
)

// HealthCheck reports that the API process is up.
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
