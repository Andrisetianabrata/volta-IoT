package cli

import (
	"path/filepath"
	"testing"
)

func TestDefaultsToDataDir(t *testing.T) {
	a, err := Parse([]string{})
	if err != nil {
		t.Fatal(err)
	}
	if a.DataFolder != "./data" || a.ConfigSet {
		t.Fatalf("%+v", a)
	}
}

func TestAcceptsLegacyCamelCaseFlag(t *testing.T) {
	a, err := Parse([]string{"--dataFolder", "/tmp/x"})
	if err != nil {
		t.Fatal(err)
	}
	if a.DataFolder != "/tmp/x" {
		t.Fatalf("%+v", a)
	}
}

func TestExplicitConfigOverridesDefaultPath(t *testing.T) {
	a, err := Parse([]string{"--data-folder", "/tmp/d", "--config", "/tmp/c.toml"})
	if err != nil {
		t.Fatal(err)
	}
	if a.ResolvedConfigPath() != "/tmp/c.toml" {
		t.Fatalf("%+v", a)
	}
}

func TestDefaultConfigPathLivesInsideDataFolder(t *testing.T) {
	a, err := Parse([]string{"--data-folder", "/tmp/d"})
	if err != nil {
		t.Fatal(err)
	}
	if a.ResolvedConfigPath() != filepath.Join("/tmp/d", "server.toml") {
		t.Fatalf("%+v", a)
	}
}
