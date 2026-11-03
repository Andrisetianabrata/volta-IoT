use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtaJob {
    pub device_id: String,
    pub url: String,
    pub version: String,
    pub started_at: i64,
}

#[derive(Debug, Default)]
pub struct OtaManager {
    jobs: RwLock<HashMap<String, OtaJob>>,
}

impl OtaManager {
    pub async fn start(&self, device_id: &str, url: &str, version: &str) -> OtaJob {
        let job = OtaJob {
            device_id: device_id.to_string(),
            url: url.to_string(),
            version: version.to_string(),
            started_at: crate::storage::now_unix(),
        };
        self.jobs.write().await.insert(device_id.to_string(), job.clone());
        job
    }

    pub async fn stop(&self, device_id: &str) {
        self.jobs.write().await.remove(device_id);
    }

    pub async fn get(&self, device_id: &str) -> Option<OtaJob> {
        self.jobs.read().await.get(device_id).cloned()
    }

    pub fn cmd_payload(job: &OtaJob) -> String {
        serde_json::json!({"ota": {"url": job.url, "version": job.version}}).to_string()
    }
}

pub type SharedOta = Arc<OtaManager>;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn start_stop_roundtrip() {
        let m = OtaManager::default();
        m.start("d1", "http://x/f.bin", "1.0.1").await;
        assert!(m.get("d1").await.is_some());
        m.stop("d1").await;
        assert!(m.get("d1").await.is_none());
    }
}
