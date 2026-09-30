// Package auth puts a single shared password in front of endpoints that
// are too expensive to leave open — the metadata report drives a headless
// browser. It's meant for one person, not user accounts: one password
// from env, and short-lived stateless tokens once it's entered.
package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// SessionTTL is how long a token from Login stays valid.
const SessionTTL = time.Hour

// Gate checks the password from METADATA_PASSWORD and issues tokens of the
// form "<unix expiry>.<HMAC of expiry>". The HMAC key is random per
// process, so a restart logs everyone out — fine for a personal tool, and
// it means there's no second secret to configure.
type Gate struct {
	passwordHash [32]byte
	enabled      bool
	key          []byte
	now          func() time.Time
}

// NewGateFromEnv reads METADATA_PASSWORD. When it's unset the gate stays
// locked: Login and Require refuse everything rather than fall open.
func NewGateFromEnv() *Gate {
	return newGate(os.Getenv("METADATA_PASSWORD"))
}

func newGate(password string) *Gate {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		panic("auth: no randomness for token key: " + err.Error())
	}
	return &Gate{
		passwordHash: sha256.Sum256([]byte(password)),
		enabled:      password != "",
		key:          key,
		now:          time.Now,
	}
}

func (g *Gate) Enabled() bool { return g.enabled }

// Login returns a fresh token and its expiry when password matches.
func (g *Gate) Login(password string) (token string, expiresAt time.Time, ok bool) {
	if !g.enabled {
		return "", time.Time{}, false
	}
	// Compare hashes so the comparison is constant-time regardless of
	// the guessed password's length.
	got := sha256.Sum256([]byte(password))
	if subtle.ConstantTimeCompare(got[:], g.passwordHash[:]) != 1 {
		return "", time.Time{}, false
	}
	expiresAt = g.now().Add(SessionTTL).Truncate(time.Second)
	exp := strconv.FormatInt(expiresAt.Unix(), 10)
	return exp + "." + g.sign(exp), expiresAt, true
}

// Valid reports whether token was issued by this process and hasn't
// expired.
func (g *Gate) Valid(token string) bool {
	if !g.enabled {
		return false
	}
	exp, sig, found := strings.Cut(token, ".")
	if !found || !hmac.Equal([]byte(sig), []byte(g.sign(exp))) {
		return false
	}
	unix, err := strconv.ParseInt(exp, 10, 64)
	if err != nil {
		return false
	}
	return g.now().Before(time.Unix(unix, 0))
}

func (g *Gate) sign(exp string) string {
	mac := hmac.New(sha256.New, g.key)
	mac.Write([]byte(exp))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// Require rejects requests without a valid "Authorization: Bearer <token>"
// with 401 (or 503 when no password is configured at all).
func (g *Gate) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !g.enabled {
			writeError(w, http.StatusServiceUnavailable, "locked: METADATA_PASSWORD is not set on the server")
			return
		}
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok || !g.Valid(token) {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
