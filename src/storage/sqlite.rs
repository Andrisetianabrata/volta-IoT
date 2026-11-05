use std::str::FromStr;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions};

use super::*;

pub struct SqliteStorage {
    pool: SqlitePool,
}

impl SqliteStorage {
    pub async fn new(db_path: &str, busy_timeout_ms: u64) -> Result<Self, sqlx::Error> {
        let url = if db_path == ":memory:" {
            "sqlite::memory:".to_string()
        } else {
            format!("sqlite://{db_path}")
        };
        let mut opts = SqliteConnectOptions::from_str(&url)?
            .journal_mode(SqliteJournalMode::Wal)
            .busy_timeout(std::time::Duration::from_millis(busy_timeout_ms))
            .create_if_missing(true);
        if db_path == ":memory:" {
            opts = opts.shared_cache(true);
        }
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await?;
        sqlx::migrate!("./migrations").run(&pool).await?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

impl Storage for SqliteStorage {
    async fn create_user(&self, id: &str, email: &str, pass_hash: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO users(id,email,pass_hash,created_at) VALUES(?,?,?,?)")
            .bind(id).bind(email).bind(pass_hash).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM users WHERE email=?").bind(email).fetch_optional(&self.pool).await
    }
    async fn create_session(&self, id: &str, user_id: &str, now: i64, expires: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO sessions(id,user_id,created_at,expires_at) VALUES(?,?,?,?)")
            .bind(id).bind(user_id).bind(now).bind(expires)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_session(&self, id: &str) -> Result<Option<Session>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM sessions WHERE id=?").bind(id).fetch_optional(&self.pool).await
    }
    async fn delete_session(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM sessions WHERE id=?").bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn create_device(&self, id: &str, user_id: &str, name: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO devices(id,user_id,name,created_at) VALUES(?,?,?,?)")
            .bind(id).bind(user_id).bind(name).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn list_devices(&self, user_id: &str) -> Result<Vec<Device>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM devices WHERE user_id=?").bind(user_id).fetch_all(&self.pool).await
    }
    async fn get_device(&self, id: &str) -> Result<Option<Device>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM devices WHERE id=?").bind(id).fetch_optional(&self.pool).await
    }
    async fn delete_device(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM devices WHERE id=?").bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn issue_token(&self, token: &str, device_id: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO device_tokens(token,device_id,revoked,created_at) VALUES(?,?,0,?)")
            .bind(token).bind(device_id).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn lookup_token(&self, token: &str) -> Result<Option<DeviceToken>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM device_tokens WHERE token=?").bind(token).fetch_optional(&self.pool).await
    }
    async fn revoke_token(&self, token: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE device_tokens SET revoked=1 WHERE token=?").bind(token).execute(&self.pool).await.map(|_| ())
    }
    async fn list_valid_tokens(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows: Vec<(String,)> = sqlx::query_as("SELECT token FROM device_tokens WHERE revoked=0").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
    async fn list_online_device_ids(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows: Vec<(String,)> = sqlx::query_as("SELECT device_id FROM device_status WHERE online!=0").fetch_all(&self.pool).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }
    async fn upsert_pin(&self, device_id: &str, pin: &str, value: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO pin_state(device_id,pin,value,updated_at) VALUES(?,?,?,?) ON CONFLICT(device_id,pin) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at")
            .bind(device_id).bind(pin).bind(value).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_pin(&self, device_id: &str, pin: &str) -> Result<Option<PinState>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM pin_state WHERE device_id=? AND pin=?").bind(device_id).bind(pin).fetch_optional(&self.pool).await
    }
    async fn list_pins(&self, device_id: &str) -> Result<Vec<PinState>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM pin_state WHERE device_id=?").bind(device_id).fetch_all(&self.pool).await
    }
    async fn insert_history(&self, device_id: &str, pin: &str, value: &str, ts: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO pin_history(device_id,pin,value,ts) VALUES(?,?,?,?)")
            .bind(device_id).bind(pin).bind(value).bind(ts)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn query_history(&self, device_id: &str, pin: &str, from: i64, to: i64, limit: i64) -> Result<Vec<PinHistory>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM pin_history WHERE device_id=? AND pin=? AND ts>=? AND ts<=? ORDER BY ts ASC LIMIT ?")
            .bind(device_id).bind(pin).bind(from).bind(to).bind(limit)
            .fetch_all(&self.pool).await
    }
    async fn create_dashboard(&self, id: &str, user_id: &str, name: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO dashboards(id,user_id,name,created_at) VALUES(?,?,?,?)")
            .bind(id).bind(user_id).bind(name).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_dashboard(&self, id: &str) -> Result<Option<Dashboard>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM dashboards WHERE id=?").bind(id).fetch_optional(&self.pool).await
    }
    async fn list_dashboards(&self, user_id: &str) -> Result<Vec<Dashboard>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM dashboards WHERE user_id=?").bind(user_id).fetch_all(&self.pool).await
    }
    async fn update_dashboard(&self, id: &str, name: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE dashboards SET name=? WHERE id=?").bind(name).bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn delete_dashboard(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM dashboards WHERE id=?").bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn create_widget(&self, id: &str, dashboard_id: &str, kind: &str, pin: &str, config: &str) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO dashboard_widgets(id,dashboard_id,kind,pin,config) VALUES(?,?,?,?,?)")
            .bind(id).bind(dashboard_id).bind(kind).bind(pin).bind(config)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_widget(&self, id: &str) -> Result<Option<Widget>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM dashboard_widgets WHERE id=?").bind(id).fetch_optional(&self.pool).await
    }
    async fn update_widget(&self, id: &str, kind: &str, pin: &str, config: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE dashboard_widgets SET kind=?, pin=?, config=? WHERE id=?").bind(kind).bind(pin).bind(config).bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn delete_widget(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM dashboard_widgets WHERE id=?").bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn list_widgets(&self, dashboard_id: &str) -> Result<Vec<Widget>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM dashboard_widgets WHERE dashboard_id=?").bind(dashboard_id).fetch_all(&self.pool).await
    }
    async fn create_share(&self, token: &str, dashboard_id: &str, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO shares(token,dashboard_id,created_at) VALUES(?,?,?)")
            .bind(token).bind(dashboard_id).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_share(&self, token: &str) -> Result<Option<Share>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM shares WHERE token=?").bind(token).fetch_optional(&self.pool).await
    }
    async fn get_share_by_dashboard(&self, dashboard_id: &str) -> Result<Option<Share>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM shares WHERE dashboard_id=?").bind(dashboard_id).fetch_optional(&self.pool).await
    }
    async fn delete_share_by_dashboard(&self, dashboard_id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM shares WHERE dashboard_id=?").bind(dashboard_id).execute(&self.pool).await.map(|_| ())
    }
    async fn enqueue_mail(&self, to: &str, subject: &str, body: &str, now: i64) -> Result<i64, sqlx::Error> {
        let r = sqlx::query("INSERT INTO mail_queue(to_addr,subject,body,attempts,next_try,status) VALUES(?,?,?,0,?,'pending')")
            .bind(to).bind(subject).bind(body).bind(now)
            .execute(&self.pool).await?;
        Ok(r.last_insert_rowid())
    }
    async fn claim_mail_batch(&self, limit: i64, now: i64) -> Result<Vec<MailItem>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM mail_queue WHERE status='pending' AND next_try<=? ORDER BY id ASC LIMIT ?")
            .bind(now).bind(limit).fetch_all(&self.pool).await
    }
    async fn mark_mail_sent(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE mail_queue SET status='sent' WHERE id=?").bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn mark_mail_retry(&self, id: i64, attempts: i64, next_try: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE mail_queue SET attempts=?, next_try=? WHERE id=?").bind(attempts).bind(next_try).bind(id).execute(&self.pool).await.map(|_| ())
    }
    async fn mail_pending_count(&self) -> Result<i64, sqlx::Error> {
        let (c,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM mail_queue WHERE status='pending'").fetch_one(&self.pool).await?;
        Ok(c)
    }
    async fn create_rule(&self, r: &Rule) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO rules(id,user_id,device_id,pin,op,threshold,action,action_pin,action_value,enabled) VALUES(?,?,?,?,?,?,?,?,?,?)")
            .bind(&r.id).bind(&r.user_id).bind(&r.device_id).bind(&r.pin).bind(&r.op).bind(r.threshold).bind(&r.action).bind(&r.action_pin).bind(&r.action_value).bind(r.enabled)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn list_rules(&self, user_id: &str) -> Result<Vec<Rule>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM rules WHERE user_id=?").bind(user_id).fetch_all(&self.pool).await
    }
    async fn list_rules_for_pin(&self, device_id: &str, pin: &str) -> Result<Vec<Rule>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM rules WHERE device_id=? AND pin=? AND enabled=1").bind(device_id).bind(pin).fetch_all(&self.pool).await
    }
    async fn set_status(&self, device_id: &str, online: bool, now: i64) -> Result<(), sqlx::Error> {
        sqlx::query("INSERT INTO device_status(device_id,online,updated_at) VALUES(?,?,?) ON CONFLICT(device_id) DO UPDATE SET online=excluded.online, updated_at=excluded.updated_at")
            .bind(device_id).bind(if online {1} else {0}).bind(now)
            .execute(&self.pool).await.map(|_| ())
    }
    async fn get_status(&self, device_id: &str) -> Result<Option<DeviceStatus>, sqlx::Error> {
        sqlx::query_as("SELECT * FROM device_status WHERE device_id=?").bind(device_id).fetch_optional(&self.pool).await
    }
}

#[cfg(test)]
mod tests {
    use super::super::now_unix;
    use super::*;

    async fn mem() -> SqliteStorage {
        SqliteStorage::new(":memory:", 5000).await.unwrap()
    }

    #[tokio::test]
    async fn user_session_crud() {
        let s = mem().await;
        let now = now_unix();
        s.create_user("u1", "a@b.c", "h", now).await.unwrap();
        assert!(s.get_user_by_email("a@b.c").await.unwrap().is_some());
        s.create_session("s1", "u1", now, now + 3600).await.unwrap();
        assert!(s.get_session("s1").await.unwrap().is_some());
        s.delete_session("s1").await.unwrap();
        assert!(s.get_session("s1").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn device_token_pin_flow() {
        let s = mem().await;
        let now = now_unix();
        s.create_user("u1", "a@b.c", "h", now).await.unwrap();
        s.create_device("d1", "u1", "esp", now).await.unwrap();
        s.issue_token(&"t".repeat(32), "d1", now).await.unwrap();
        s.upsert_pin("d1", "V0", "1", now).await.unwrap();
        s.insert_history("d1", "V0", "1", now).await.unwrap();
        assert_eq!(s.list_pins("d1").await.unwrap().len(), 1);
        assert_eq!(s.query_history("d1", "V0", 0, now + 10, 100).await.unwrap().len(), 1);
        s.set_status("d1", true, now).await.unwrap();
        assert_eq!(s.get_status("d1").await.unwrap().unwrap().online, 1);
    }

    #[tokio::test]
    async fn valid_tokens_exclude_revoked() {
        let s = mem().await;
        let now = now_unix();
        s.create_user("u1", "a@b.c", "h", now).await.unwrap();
        s.create_device("d1", "u1", "esp", now).await.unwrap();
        s.issue_token(&"a".repeat(32), "d1", now).await.unwrap();
        s.issue_token(&"b".repeat(32), "d1", now).await.unwrap();
        s.revoke_token(&"a".repeat(32)).await.unwrap();
        assert_eq!(s.list_valid_tokens().await.unwrap(), vec!["b".repeat(32)]);
        let online = s.list_online_device_ids().await.unwrap();
        assert!(online.is_empty());
        s.set_status("d1", true, now).await.unwrap();
        assert_eq!(s.list_online_device_ids().await.unwrap(), vec!["d1".to_string()]);
    }

    #[tokio::test]
    async fn widget_crud_roundtrip() {
        let s = mem().await;
        let now = now_unix();
        s.create_user("u1", "a@b.c", "h", now).await.unwrap();
        s.create_dashboard("db1", "u1", "main", now).await.unwrap();
        assert!(s.get_dashboard("db1").await.unwrap().is_some());
        assert!(s.get_dashboard("nope").await.unwrap().is_none());
        s.create_widget("w1", "db1", "Gauge", "V0", "{}").await.unwrap();
        assert_eq!(s.get_widget("w1").await.unwrap().unwrap().kind, "Gauge");
        s.update_widget("w1", "Button", "V1", "{\"max\":100}").await.unwrap();
        let w = s.get_widget("w1").await.unwrap().unwrap();
        assert_eq!((w.kind.as_str(), w.pin.as_str()), ("Button", "V1"));
        s.delete_widget("w1").await.unwrap();
        assert!(s.get_widget("w1").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn dashboard_widget_mail_rule() {
        let s = mem().await;
        let now = now_unix();
        s.create_user("u1", "a@b.c", "h", now).await.unwrap();
        s.create_dashboard("db1", "u1", "main", now).await.unwrap();
        s.create_widget("w1", "db1", "Button", "V0", "{}").await.unwrap();
        assert_eq!(s.list_dashboards("u1").await.unwrap().len(), 1);
        s.enqueue_mail("a@b.c", "hi", "body", now).await.unwrap();
        assert_eq!(s.mail_pending_count().await.unwrap(), 1);
        let r = Rule { id: "r1".into(), user_id: "u1".into(), device_id: "d1".into(), pin: "V0".into(), op: "gt".into(), threshold: 5.0, action: "notify".into(), action_pin: "".into(), action_value: "".into(), enabled: 1 };
        s.create_rule(&r).await.unwrap();
        assert_eq!(s.list_rules("u1").await.unwrap().len(), 1);
    }
}
