use std::sync::atomic::{AtomicU64, Ordering};

use serde::Serialize;

#[derive(Debug)]
pub struct Stats {
    started: std::time::Instant,
    pub msgs: AtomicU64,
    pub cmds: AtomicU64,
    pub logins: AtomicU64,
}

impl Stats {
    pub fn new() -> Self {
        Self {
            started: std::time::Instant::now(),
            msgs: AtomicU64::new(0),
            cmds: AtomicU64::new(0),
            logins: AtomicU64::new(0),
        }
    }    pub fn inc_msgs(&self) {
        self.msgs.fetch_add(1, Ordering::Relaxed);
    }
    pub fn inc_cmds(&self) {
        self.cmds.fetch_add(1, Ordering::Relaxed);
    }
    pub fn inc_logins(&self) {
        self.logins.fetch_add(1, Ordering::Relaxed);
    }
    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            uptime_secs: self.started.elapsed().as_secs(),
            msgs: self.msgs.load(Ordering::Relaxed),
            cmds: self.cmds.load(Ordering::Relaxed),
            logins: self.logins.load(Ordering::Relaxed),
        }
    }
}

impl Default for Stats {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub uptime_secs: u64,
    pub msgs: u64,
    pub cmds: u64,
    pub logins: u64,
}
