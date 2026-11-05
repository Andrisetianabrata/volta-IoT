package ota

import (
	"strings"
	"testing"
)

func TestStartStopRoundtrip(t *testing.T) {
	m := NewManager()
	m.Start("d1", "http://x/f.bin", "1.0.1")
	if _, ok := m.Get("d1"); !ok {
		t.Fatal("missing job")
	}
	m.Stop("d1")
	if _, ok := m.Get("d1"); ok {
		t.Fatal("job not stopped")
	}
}

func TestCmdPayloadShape(t *testing.T) {
	m := NewManager()
	j := m.Start("d1", "http://x/f.bin", "1.0.1")
	p := CmdPayload(j)
	if !strings.Contains(p, "http://x/f.bin") || !strings.Contains(p, "1.0.1") {
		t.Fatalf("payload=%s", p)
	}
}
