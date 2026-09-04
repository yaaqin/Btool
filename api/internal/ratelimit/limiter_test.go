package ratelimit

import (
	"testing"
	"time"
)

func TestAllowBlocksAfterMax(t *testing.T) {
	l := New(Config{Max: 3, Window: time.Hour})

	for i := 1; i <= 3; i++ {
		if !l.Allow("1.2.3.4") {
			t.Fatalf("attempt %d: expected allowed", i)
		}
	}
	if l.Allow("1.2.3.4") {
		t.Fatal("4th attempt: expected blocked")
	}
}

func TestAllowIsPerKey(t *testing.T) {
	l := New(Config{Max: 1, Window: time.Hour})

	if !l.Allow("1.2.3.4") {
		t.Fatal("first IP: expected allowed")
	}
	if !l.Allow("5.6.7.8") {
		t.Fatal("different IP: expected allowed regardless of the first IP's usage")
	}
}

func TestAllowResetsAfterWindow(t *testing.T) {
	l := New(Config{Max: 1, Window: 30 * time.Millisecond})

	if !l.Allow("1.2.3.4") {
		t.Fatal("first attempt: expected allowed")
	}
	if l.Allow("1.2.3.4") {
		t.Fatal("second attempt inside window: expected blocked")
	}

	time.Sleep(40 * time.Millisecond)

	if !l.Allow("1.2.3.4") {
		t.Fatal("attempt after window elapsed: expected allowed")
	}
}
