package mailer

import (
	"strings"
	"testing"
)

func TestTemplatesContainLink(t *testing.T) {
	s, b := RenderRegister("VOLTA.", "http://x/verify")
	if !strings.Contains(s, "VOLTA.") || !strings.Contains(b, "http://x/verify") {
		t.Fatalf("%q %q", s, b)
	}
}

func TestBackoffCapsAtOneHour(t *testing.T) {
	if BackoffSecs(0) != 30 {
		t.Fatalf("got %d", BackoffSecs(0))
	}
	if BackoffSecs(10) != 3600 {
		t.Fatalf("got %d", BackoffSecs(10))
	}
}

func TestDefaultConfigMatchesReadme(t *testing.T) {
	c := DefaultMailerConfig()
	if c.Port != 587 || c.MaxQueue != 10000 {
		t.Fatalf("%+v", c)
	}
}
