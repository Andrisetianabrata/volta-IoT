use std::sync::Arc;

use crate::broker::{can_publish, parse_topic, Topic};
use crate::storage::{now_unix, Storage};

use super::{PinBus, PinEvent};

pub async fn handle_publish<S: Storage>(
    db: &Arc<S>,
    bus: &PinBus,
    device_id: &str,
    topic: &str,
    payload: &str,
) -> Result<(), String> {
    let parsed = parse_topic(topic).ok_or("topik tidak dikenal")?;
    if !can_publish(device_id, &parsed) {
        return Err("acl menolak publish".into());
    }
    match parsed {
        Topic::State { device, pin } => {
            let now = now_unix();
            db.upsert_pin(&device, &pin, payload, now).await.map_err(|e| e.to_string())?;
            db.insert_history(&device, &pin, payload, now).await.map_err(|e| e.to_string())?;
            bus.publish(PinEvent { device_id: device, pin, value: payload.to_string() });
            Ok(())
        }
        Topic::Log { .. } => {
            bus.publish(PinEvent { device_id: device_id.to_string(), pin: "log".into(), value: payload.to_string() });
            Ok(())
        }
        _ => Err("topik bukan untuk publish device".into()),
    }
}

#[cfg(test)]
mod tests {
    use crate::pins::PinBus;
    use crate::storage::sqlite::SqliteStorage;

    use super::*;
    use std::sync::Arc;

    #[tokio::test]
    async fn state_publish_stored_and_broadcast() {
        let db = Arc::new(SqliteStorage::new(":memory:", 5000).await.unwrap());
        let now = now_unix();
        db.create_user("u1", "a@b.c", "h", now).await.unwrap();
        db.create_device("d1", "u1", "esp", now).await.unwrap();
        let bus = PinBus::new(16);
        let mut rx = bus.subscribe();
        handle_publish(&db, &bus, "d1", "volta/dev/d1/state/V0", "42").await.unwrap();
        let pin = db.get_pin("d1", "V0").await.unwrap().unwrap();
        assert_eq!(pin.value, "42");
        let ev = rx.recv().await.unwrap();
        assert_eq!(ev.value, "42");
        assert!(handle_publish(&db, &bus, "d2", "volta/dev/d1/state/V0", "1").await.is_err());
    }
}
