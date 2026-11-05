package acme

type AcmeConfig struct {
	Enabled  bool     `toml:"enabled" json:"enabled"`
	Email    string   `toml:"email" json:"email"`
	Domains  []string `toml:"domains" json:"domains"`
	CacheDir string   `toml:"cache_dir" json:"cache_dir"`
}

func DefaultAcmeConfig() AcmeConfig {
	return AcmeConfig{Enabled: false, Email: "", Domains: nil, CacheDir: "data/acme"}
}

func DirectoryURL(staging bool) string {
	if staging {
		return "https://acme-staging-v02.api.letsencrypt.org/directory"
	}
	return "https://acme-v02.api.letsencrypt.org/directory"
}
