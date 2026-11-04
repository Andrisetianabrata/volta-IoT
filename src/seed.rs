use crate::storage::{now_unix, Storage};

/* Data demo untuk pengembangan UI: 2 device contoh + 1 board + 6 widget.
   Opt-in via VOLTA_SEED_DEMO=1, idempoten, tidak jalan di produksi default.
   Semua nama berprefix "Contoh" agar tidak dikira data asli (R-38). */

pub const DEMO_BOARD_NAME: &str = "Contoh Ruang Server";

fn widget_cfg(device: &str, label: &str, extra: &str, x: u32, y: u32, w: u32, h: u32) -> String {
    format!(
        "{{\"device\":\"{device}\",\"label\":\"{label}\",{extra}\"x\":{x},\"y\":{y},\"w\":{w},\"h\":{h}}}"
    )
}

/// Seed board demo milik admin. True bila dibuat sekarang.
pub async fn seed_demo<S: Storage>(db: &S) -> Result<bool, sqlx::Error> {
    let admin = match db.get_user_by_email("admin@admin.com").await? {
        Some(u) => u,
        None => return Ok(false),
    };
    if db
        .list_dashboards(&admin.id)
        .await?
        .iter()
        .any(|d| d.name == DEMO_BOARD_NAME)
    {
        return Ok(false);
    }
    let now = now_unix();
    for (id, name) in [("demo-ruang-a", "Contoh Ruang A"), ("demo-ruang-b", "Contoh Pompa B")] {
        if db.get_device(id).await?.is_none() {
            db.create_device(id, &admin.id, name, now).await?;
        }
    }
    db.create_dashboard("demo-board-1", &admin.id, DEMO_BOARD_NAME, now)
        .await?;
    let widgets = [
        ("demo-w1", "gauge", "t1", widget_cfg("demo-ruang-a", "Suhu", "\"unit\":\"°C\",\"min\":0,\"max\":50,", 0, 0, 4, 1)),
        ("demo-w2", "labeled-value", "hum", widget_cfg("demo-ruang-a", "Kelembapan", "\"unit\":\"%\",", 4, 0, 4, 1)),
        ("demo-w3", "led", "relay", widget_cfg("demo-ruang-b", "Pompa", "", 8, 0, 2, 1)),
        ("demo-w4", "button", "relay", widget_cfg("demo-ruang-b", "Pompa", "\"on\":\"1\",\"off\":\"0\",", 10, 0, 2, 1)),
        ("demo-w5", "history-chart", "t1", widget_cfg("demo-ruang-a", "Suhu 24 jam", "\"unit\":\"°C\",", 0, 1, 8, 2)),
        ("demo-w6", "slider", "pwm", widget_cfg("demo-ruang-b", "Redup lampu", "\"min\":0,\"max\":1023,", 8, 1, 4, 1)),
    ];
    for (id, kind, pin, cfg) in widgets {
        db.create_widget(id, "demo-board-1", kind, pin, &cfg).await?;
    }
    db.upsert_pin("demo-ruang-a", "t1", "28.5", now).await?;
    db.upsert_pin("demo-ruang-a", "hum", "61", now).await?;
    db.upsert_pin("demo-ruang-b", "relay", "1", now).await?;
    db.upsert_pin("demo-ruang-b", "pwm", "220", now).await?;
    for i in 0..24u64 {
        let v = format!("{:.1}", 27.0 + ((i * 37) % 40) as f64 / 10.0);
        db.insert_history("demo-ruang-a", "t1", &v, now - (23 - i as i64) * 3600)
            .await?;
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use crate::auth::seed_admin;
    use crate::storage::sqlite::SqliteStorage;

    use super::*;

    #[tokio::test]
    async fn seed_demo_idempotent() {
        let db = SqliteStorage::new(":memory:", 5000).await.unwrap();
        assert!(seed_admin(&db).await.unwrap());
        assert!(seed_demo(&db).await.unwrap());
        assert!(!seed_demo(&db).await.unwrap());
        let admin = db.get_user_by_email("admin@admin.com").await.unwrap().unwrap();
        let boards = db.list_dashboards(&admin.id).await.unwrap();
        assert!(boards.iter().any(|d| d.name == DEMO_BOARD_NAME));
        assert_eq!(db.list_widgets("demo-board-1").await.unwrap().len(), 6);
        assert!(db.get_pin("demo-ruang-a", "t1").await.unwrap().is_some());
    }
}
