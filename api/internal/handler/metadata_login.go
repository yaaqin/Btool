package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/yaaqin/builder-tool/internal/auth"
)

type metadataLoginRequest struct {
	Password string `json:"password"`
}

type metadataLoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// MetadataLogin handles POST /api/v1/metadata/login: trade the password
// for a token that unlocks POST /api/v1/metadata for auth.SessionTTL.
func MetadataLogin(gate *auth.Gate) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !gate.Enabled() {
			writeError(w, http.StatusServiceUnavailable, "locked: METADATA_PASSWORD is not set on the server")
			return
		}
		var req metadataLoginRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		token, expiresAt, ok := gate.Login(req.Password)
		if !ok {
			writeError(w, http.StatusUnauthorized, "wrong password")
			return
		}
		writeJSON(w, http.StatusOK, metadataLoginResponse{Token: token, ExpiresAt: expiresAt})
	}
}
