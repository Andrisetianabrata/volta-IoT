use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("cannot read {0}: {1}")]
    Io(PathBuf, #[source] std::io::Error),
    #[error("cannot parse {0}: {1}")]
    Parse(PathBuf, #[source] toml::de::Error),
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub mqtt: MqttConfig,
    pub http: HttpConfig,
    pub storage: StorageConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct ServerConfig {
    pub log_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct MqttConfig {
    pub local_port: u16,
    pub tls_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct HttpConfig {
    pub https_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, deny_unknown_fields)]
pub struct StorageConfig {
    pub busy_timeout_ms: u64,
    pub db_file: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            log_level: "info".to_string(),
        }
    }
}

impl Default for MqttConfig {
    fn default() -> Self {
        Self {
            local_port: 1883,
            tls_port: 8883,
        }
    }
}

impl Default for HttpConfig {
    fn default() -> Self {
        Self { https_port: 9443 }
    }
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            busy_timeout_ms: 5000,
            db_file: "blynk.db".to_string(),
        }
    }
}

impl AppConfig {
    pub fn load(config_path: &Path) -> Result<Self, ConfigError> {
        if !config_path.exists() {
            return Ok(Self::default());
        }
        let text = std::fs::read_to_string(config_path)
            .map_err(|e| ConfigError::Io(config_path.to_path_buf(), e))?;
        if text.trim().is_empty() {
            return Ok(Self::default());
        }
        toml::from_str(&text).map_err(|e| ConfigError::Parse(config_path.to_path_buf(), e))
    }

    pub fn db_path(&self, data_folder: &Path) -> PathBuf {
        let f = std::path::Path::new(&self.storage.db_file);
        if f.is_absolute() {
            f.to_path_buf()
        } else {
            data_folder.join(f)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_match_plan() {
        let cfg = AppConfig::default();
        assert_eq!(cfg.mqtt.local_port, 1883);
        assert_eq!(cfg.mqtt.tls_port, 8883);
        assert_eq!(cfg.http.https_port, 9443);
        assert_eq!(cfg.storage.busy_timeout_ms, 5000);
        assert_eq!(cfg.server.log_level, "info");
    }

    #[test]
    fn missing_file_falls_back_to_defaults() {
        let cfg = AppConfig::load(Path::new("/definitely/not/here/server.toml")).unwrap();
        assert_eq!(cfg, AppConfig::default());
    }

    #[test]
    fn partial_file_merges_with_defaults() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.toml");
        std::fs::write(&path, "[mqtt]\nlocal_port = 11883\n").unwrap();
        let cfg = AppConfig::load(&path).unwrap();
        assert_eq!(cfg.mqtt.local_port, 11883);
        assert_eq!(cfg.mqtt.tls_port, 8883);
        assert_eq!(cfg.http.https_port, 9443);
    }

    #[test]
    fn invalid_toml_returns_parse_error() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.toml");
        std::fs::write(&path, "[mqtt\nlocal_port = ").unwrap();
        assert!(AppConfig::load(&path).is_err());
    }

    #[test]
    fn unknown_fields_are_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.toml");
        std::fs::write(&path, "[nope]\nfoo = 1\n").unwrap();
        assert!(AppConfig::load(&path).is_err());
    }

    #[test]
    fn db_path_resolves_relative_to_data_folder() {
        let cfg = AppConfig::default();
        let p = cfg.db_path(Path::new("/data"));
        assert_eq!(p, Path::new("/data/blynk.db"));
    }
}
