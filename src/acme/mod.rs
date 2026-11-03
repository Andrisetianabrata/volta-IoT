use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct AcmeConfig {
    pub enabled: bool,
    pub email: String,
    pub domains: Vec<String>,
    pub cache_dir: String,
}

impl Default for AcmeConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            email: String::new(),
            domains: vec![],
            cache_dir: "data/acme".into(),
        }
    }
}

pub fn directory_url(staging: bool) -> &'static str {
    if staging {
        "https://acme-staging-v02.api.letsencrypt.org/directory"
    } else {
        "https://acme-v02.api.letsencrypt.org/directory"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn staging_url_differs() {
        assert_ne!(directory_url(true), directory_url(false));
    }
}
