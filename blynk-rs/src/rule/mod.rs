use std::sync::Arc;

use crate::pins::PinBus;
use crate::storage::{now_unix, Storage};

pub fn matches(op: &str, value: &str, threshold: f64) -> bool {
    match value.parse::<f64>() {
        Ok(v) => match op {
            "gt" => v > threshold,
            "gte" => v >= threshold,
            "lt" => v < threshold,
            "lte" => v <= threshold,
            "eq" => (v - threshold).abs() < f64::EPSILON,
            _ => false,
        },
        Err(_) => op == "changed",
    }
}

pub async fn run<S: Storage + 'static>(
    db: Arc<S>,
    bus: PinBus,
    cmds: Arc<crate::pins::command::CommandBus>,
) {
    let mut rx = bus.subscribe();
    while let Ok(ev) = rx.recv().await {
        let Ok(rules) = db.list_rules_for_pin(&ev.device_id, &ev.pin).await else { continue };
        for r in rules {
            if !matches(&r.op, &ev.value, r.threshold) {
                continue;
            }
            match r.action.as_str() {
                "set_pin" if !r.action_pin.is_empty() => {
                    let _ = cmds
                        .send(
                            crate::pins::command::CmdRequest {
                                device_id: ev.device_id.clone(),
                                pin: r.action_pin.clone(),
                                value: r.action_value.clone(),
                            },
                            std::time::Duration::from_secs(2),
                        )
                        .await;
                    let _ = db.upsert_pin(&ev.device_id, &r.action_pin, &r.action_value, now_unix()).await;
                }
                "notify" | "mail" => {
                    let _ = db.enqueue_mail("owner@localhost", &format!("Rule {}", r.id), &format!("{}={}", ev.pin, ev.value), now_unix()).await;
                }
                _ => {}
            }
        }
    }
}

pub async fn run_timer<S: Storage + 'static>(db: Arc<S>, cmds: Arc<crate::pins::command::CommandBus>) {
    let mut tick = tokio::time::interval(std::time::Duration::from_secs(60));
    loop {
        tick.tick().await;
        let now = now_unix();
        let _ = (db.clone(), cmds.clone(), now);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ops_work() {
        assert!(matches("gt", "6", 5.0));
        assert!(!matches("gt", "4", 5.0));
        assert!(matches("lte", "5", 5.0));
    }
}
