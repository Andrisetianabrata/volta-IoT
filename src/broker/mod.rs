pub mod auth;

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct BrokerConfig {
    pub local_port: u16,
    pub tls_port: u16,
}

impl Default for BrokerConfig {
    fn default() -> Self {
        Self { local_port: 1883, tls_port: 8883 }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Topic {
    State { device: String, pin: String },
    Cmd { device: String, pin: String },
    Status { device: String },
    Log { device: String },
}

pub fn parse_topic(t: &str) -> Option<Topic> {
    let p: Vec<&str> = t.split('/').collect();
    match p.as_slice() {
        ["volta", "dev", dev, "state", pin] => Some(Topic::State { device: dev.to_string(), pin: pin.to_string() }),
        ["volta", "dev", dev, "cmd", pin] => Some(Topic::Cmd { device: dev.to_string(), pin: pin.to_string() }),
        ["volta", "dev", dev, "status"] => Some(Topic::Status { device: dev.to_string() }),
        ["volta", "dev", dev, "log"] => Some(Topic::Log { device: dev.to_string() }),
        _ => None,
    }
}

pub fn state_topic(device: &str, pin: &str) -> String {
    format!("volta/dev/{device}/state/{pin}")
}

pub fn cmd_topic(device: &str, pin: &str) -> String {
    format!("volta/dev/{device}/cmd/{pin}")
}

pub fn status_topic(device: &str) -> String {
    format!("volta/dev/{device}/status")
}

pub fn can_publish(device: &str, topic: &Topic) -> bool {
    match topic {
        Topic::State { device: d, .. } | Topic::Log { device: d } => d == device,
        _ => false,
    }
}

pub fn can_subscribe(device: &str, topic: &Topic) -> bool {
    match topic {
        Topic::Cmd { device: d, .. } | Topic::Status { device: d } => d == device,
        _ => false,
    }
}

#[derive(Debug, Default)]
pub struct Retained {
    inner: RwLock<HashMap<String, String>>,
}

impl Retained {
    pub async fn set(&self, topic: String, payload: String) {
        self.inner.write().await.insert(topic, payload);
    }
    pub async fn get(&self, topic: &str) -> Option<String> {
        self.inner.read().await.get(topic).cloned()
    }
}

pub struct Broker {
    pub config: BrokerConfig,
    pub retained: Arc<Retained>,
    pub live_tokens: Arc<RwLock<std::collections::HashSet<String>>>,
}

impl Broker {
    pub fn new(config: BrokerConfig) -> Self {
        Self { config, retained: Arc::new(Retained::default()), live_tokens: Arc::new(RwLock::new(std::collections::HashSet::new())) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn topics_roundtrip() {
        assert_eq!(state_topic("d1", "V0"), "volta/dev/d1/state/V0");
        assert!(matches!(parse_topic("volta/dev/d1/state/V0"), Some(Topic::State { .. })));
        assert!(parse_topic("volta/dev/d1/nope").is_none());
    }

    #[test]
    fn acl_enforced() {
        let t = parse_topic("volta/dev/d1/state/V0").unwrap();
        assert!(can_publish("d1", &t));
        assert!(!can_publish("d2", &t));
        let c = parse_topic("volta/dev/d1/cmd/V0").unwrap();
        assert!(can_subscribe("d1", &c));
        assert!(!can_publish("d1", &c));
    }
}
