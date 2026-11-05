package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

type ServerConfig struct {
	LogLevel string `toml:"log_level"`
}

type MqttConfig struct {
	LocalPort uint16 `toml:"local_port"`
	TLSPort   uint16 `toml:"tls_port"`
}

type HttpConfig struct {
	HttpsPort uint16 `toml:"https_port"`
}

type StorageConfig struct {
	BusyTimeoutMs uint64 `toml:"busy_timeout_ms"`
	DbFile        string `toml:"db_file"`
}

type AppConfig struct {
	Server  ServerConfig  `toml:"server"`
	Mqtt    MqttConfig    `toml:"mqtt"`
	Http    HttpConfig    `toml:"http"`
	Storage StorageConfig `toml:"storage"`
}

func DefaultConfig() AppConfig {
	return AppConfig{
		Server:  ServerConfig{LogLevel: "info"},
		Mqtt:    MqttConfig{LocalPort: 1883, TLSPort: 8883},
		Http:    HttpConfig{HttpsPort: 9443},
		Storage: StorageConfig{BusyTimeoutMs: 5000, DbFile: "volta.db"},
	}
}

func Load(configPath string) (AppConfig, error) {
	cfg := DefaultConfig()
	if configPath == "" {
		return cfg, nil
	}
	text, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, fmt.Errorf("cannot read %s: %w", configPath, err)
	}
	if len(trimSpace(text)) == 0 {
		return cfg, nil
	}
	meta, err := toml.Decode(string(text), &cfg)
	if err != nil {
		return cfg, fmt.Errorf("cannot parse %s: %w", configPath, err)
	}
	if undecoded := meta.Undecoded(); len(undecoded) > 0 {
		return cfg, fmt.Errorf("cannot parse %s: unknown fields %v", configPath, undecoded)
	}
	return cfg, nil
}

func (c AppConfig) DbPath(dataFolder string) string {
	if filepath.IsAbs(c.Storage.DbFile) {
		return c.Storage.DbFile
	}
	return filepath.Join(dataFolder, c.Storage.DbFile)
}

func trimSpace(b []byte) []byte {
	s := string(b)
	i := 0
	for i < len(s) && (s[i] == ' ' || s[i] == '\t' || s[i] == '\n' || s[i] == '\r') {
		i++
	}
	j := len(s)
	for j > i && (s[j-1] == ' ' || s[j-1] == '\t' || s[j-1] == '\n' || s[j-1] == '\r') {
		j--
	}
	return []byte(s[i:j])
}
