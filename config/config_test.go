package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultsMatchPlan(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Mqtt.LocalPort != 1883 || cfg.Mqtt.TLSPort != 8883 {
		t.Fatalf("mqtt defaults: %+v", cfg.Mqtt)
	}
	if cfg.Http.HttpsPort != 9443 {
		t.Fatalf("http default: %+v", cfg.Http)
	}
	if cfg.Storage.BusyTimeoutMs != 5000 {
		t.Fatalf("storage default: %+v", cfg.Storage)
	}
	if cfg.Server.LogLevel != "info" {
		t.Fatalf("server default: %+v", cfg.Server)
	}
}

func TestMissingFileFallsBackToDefaults(t *testing.T) {
	cfg, err := Load("/definitely/not/here/server.toml")
	if err != nil {
		t.Fatal(err)
	}
	def := DefaultConfig()
	if cfg != def {
		t.Fatalf("got %+v want %+v", cfg, def)
	}
}

func TestPartialFileMergesWithDefaults(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "server.toml")
	if err := os.WriteFile(p, []byte("[mqtt]\nlocal_port = 11883\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := Load(p)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Mqtt.LocalPort != 11883 || cfg.Mqtt.TLSPort != 8883 || cfg.Http.HttpsPort != 9443 {
		t.Fatalf("merge wrong: %+v", cfg)
	}
}

func TestInvalidTomlReturnsParseError(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "server.toml")
	_ = os.WriteFile(p, []byte("[mqtt\nlocal_port = "), 0o644)
	if _, err := Load(p); err == nil {
		t.Fatal("expected error")
	}
}

func TestUnknownFieldsAreRejected(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "server.toml")
	_ = os.WriteFile(p, []byte("[nope]\nfoo = 1\n"), 0o644)
	if _, err := Load(p); err == nil {
		t.Fatal("expected error")
	}
}

func TestDbPathResolvesRelativeToDataFolder(t *testing.T) {
	cfg := DefaultConfig()
	if got := cfg.DbPath("/data"); got != filepath.Join("/data", "volta.db") {
		t.Fatalf("got %s", got)
	}
}
