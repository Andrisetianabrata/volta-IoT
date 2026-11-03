use std::path::PathBuf;

use clap::Parser;

#[derive(Parser, Debug, Clone)]
#[command(name = "blynk-rs", version, about = "Blynk Legacy rebuilt as MQTT-only server")]
pub struct Args {
    #[arg(long = "data-folder", alias = "dataFolder", default_value = "./data")]
    pub data_folder: PathBuf,

    #[arg(long = "config", alias = "configFile")]
    pub config: Option<PathBuf>,
}

impl Args {
    pub fn resolved_config_path(&self) -> PathBuf {
        if let Some(p) = &self.config {
            return p.clone();
        }
        self.data_folder.join("server.toml")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_data_dir() {
        let args = Args::try_parse_from(["blynk-rs"]).unwrap();
        assert_eq!(args.data_folder, PathBuf::from("./data"));
        assert_eq!(args.config, None);
    }

    #[test]
    fn accepts_legacy_camel_case_flag() {
        let args = Args::try_parse_from(["blynk-rs", "--dataFolder", "/tmp/x"]).unwrap();
        assert_eq!(args.data_folder, PathBuf::from("/tmp/x"));
    }

    #[test]
    fn explicit_config_overrides_default_path() {
        let args = Args::try_parse_from([
            "blynk-rs",
            "--data-folder",
            "/tmp/d",
            "--config",
            "/tmp/c.toml",
        ])
        .unwrap();
        assert_eq!(args.resolved_config_path(), PathBuf::from("/tmp/c.toml"));
    }

    #[test]
    fn default_config_path_lives_inside_data_folder() {
        let args = Args::try_parse_from(["blynk-rs", "--data-folder", "/tmp/d"]).unwrap();
        assert_eq!(
            args.resolved_config_path(),
            PathBuf::from("/tmp/d/server.toml")
        );
    }
}
