use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::broadcast;

#[derive(Debug, Default)]
pub struct CmdMetrics {
    pub sent: AtomicU64,
    pub timeouts: AtomicU64,
}

impl CmdMetrics {
    pub fn sent(&self) -> u64 {
        self.sent.load(Ordering::Relaxed)
    }
    pub fn timeouts(&self) -> u64 {
        self.timeouts.load(Ordering::Relaxed)
    }
}

#[derive(Debug, Clone)]
pub struct CmdRequest {
    pub device_id: String,
    pub pin: String,
    pub value: String,
}

pub struct CommandBus {
    tx: broadcast::Sender<CmdRequest>,
    pub metrics: Arc<CmdMetrics>,
}

impl CommandBus {
    pub fn new(cap: usize) -> Self {
        let (tx, _) = broadcast::channel(cap);
        Self { tx, metrics: Arc::new(CmdMetrics::default()) }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<CmdRequest> {
        self.tx.subscribe()
    }

    pub async fn send(&self, req: CmdRequest, timeout: Duration) -> Result<(), String> {
        self.metrics.sent.fetch_add(1, Ordering::Relaxed);
        let _ = self.tx.send(req);
        match tokio::time::timeout(timeout, async { Ok::<(), String>(()) }).await {
            Ok(r) => r,
            Err(_) => {
                self.metrics.timeouts.fetch_add(1, Ordering::Relaxed);
                Err("cmd timeout".into())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn cmd_send_received() {
        let bus = CommandBus::new(16);
        let mut rx = bus.subscribe();
        bus.send(CmdRequest { device_id: "d1".into(), pin: "V0".into(), value: "1".into() }, Duration::from_millis(50)).await.unwrap();
        let got = rx.recv().await.unwrap();
        assert_eq!(got.pin, "V0");
        assert_eq!(bus.metrics.sent(), 1);
    }
}
