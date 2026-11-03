pub mod command;
pub mod state;

use std::sync::Arc;

use tokio::sync::broadcast;

#[derive(Debug, Clone)]
pub struct PinEvent {
    pub device_id: String,
    pub pin: String,
    pub value: String,
}

#[derive(Debug, Clone)]
pub struct PinBus {
    tx: broadcast::Sender<PinEvent>,
}

impl Default for PinBus {
    fn default() -> Self {
        Self::new(1024)
    }
}

impl PinBus {
    pub fn new(cap: usize) -> Self {
        let (tx, _) = broadcast::channel(cap);
        Self { tx }
    }

    pub fn publish(&self, ev: PinEvent) {
        let _ = self.tx.send(ev);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<PinEvent> {
        self.tx.subscribe()
    }
}

pub type SharedBus = Arc<PinBus>;
