package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLogin_RejectsWrongPasswordAndAcceptsRight(t *testing.T) {
	g := newGate("s3cret")

	if _, _, ok := g.Login("nope"); ok {
		t.Fatal("wrong password accepted")
	}
	token, exp, ok := g.Login("s3cret")
	if !ok || token == "" {
		t.Fatal("right password rejected")
	}
	if d := time.Until(exp); d < 59*time.Minute || d > SessionTTL {
		t.Errorf("expiry %v from now, want ~%v", d, SessionTTL)
	}
	if !g.Valid(token) {
		t.Error("fresh token not valid")
	}
}

func TestValid_RejectsExpiredForgedAndForeignTokens(t *testing.T) {
	g := newGate("s3cret")
	token, _, _ := g.Login("s3cret")

	g.now = func() time.Time { return time.Now().Add(SessionTTL + time.Second) }
	if g.Valid(token) {
		t.Error("expired token still valid")
	}
	g.now = time.Now

	// Pushing the expiry forward breaks the signature.
	if g.Valid("99999999999." + token[len("9999999999")+1:]) {
		t.Error("tampered token accepted")
	}
	// A token from another process (another key) doesn't carry over.
	other := newGate("s3cret")
	if other.Valid(token) {
		t.Error("token from a different key accepted")
	}
	for _, bad := range []string{"", ".", "abc", "123.abc"} {
		if g.Valid(bad) {
			t.Errorf("garbage token %q accepted", bad)
		}
	}
}

func TestEmptyPassword_KeepsGateLocked(t *testing.T) {
	g := newGate("")
	if _, _, ok := g.Login(""); ok {
		t.Error("empty password opened the gate")
	}

	rec := httptest.NewRecorder()
	g.Require(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Error("handler reached with gate disabled")
	})).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status = %d, want 503", rec.Code)
	}
}

func TestRequire_NeedsBearerToken(t *testing.T) {
	g := newGate("s3cret")
	token, _, _ := g.Login("s3cret")
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	for header, want := range map[string]int{
		"":                http.StatusUnauthorized,
		"Bearer wrong":    http.StatusUnauthorized,
		token:             http.StatusUnauthorized, // missing "Bearer "
		"Bearer " + token: http.StatusOK,
	} {
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.Header.Set("Authorization", header)
		rec := httptest.NewRecorder()
		g.Require(ok).ServeHTTP(rec, req)
		if rec.Code != want {
			t.Errorf("Authorization %q: status %d, want %d", header, rec.Code, want)
		}
	}
}
