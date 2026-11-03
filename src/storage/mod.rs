pub mod devices;
pub mod sqlite;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub pass_hash: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub created_at: i64,
    pub expires_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct Device {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct DeviceToken {
    pub token: String,
    pub device_id: String,
    pub revoked: i64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct PinState {
    pub device_id: String,
    pub pin: String,
    pub value: String,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct PinHistory {
    pub id: i64,
    pub device_id: String,
    pub pin: String,
    pub value: String,
    pub ts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct Dashboard {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct Widget {
    pub id: String,
    pub dashboard_id: String,
    pub kind: String,
    pub pin: String,
    pub config: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct MailItem {
    pub id: i64,
    pub to_addr: String,
    pub subject: String,
    pub body: String,
    pub attempts: i64,
    pub next_try: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct Rule {
    pub id: String,
    pub user_id: String,
    pub device_id: String,
    pub pin: String,
    pub op: String,
    pub threshold: f64,
    pub action: String,
    pub action_pin: String,
    pub action_value: String,
    pub enabled: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
pub struct DeviceStatus {
    pub device_id: String,
    pub online: i64,
    pub updated_at: i64,
}

#[allow(async_fn_in_trait)]
pub trait Storage: Send + Sync + 'static {
    async fn create_user(&self, id: &str, email: &str, pass_hash: &str, now: i64) -> Result<(), sqlx::Error>;
    async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error>;
    async fn create_session(&self, id: &str, user_id: &str, now: i64, expires: i64) -> Result<(), sqlx::Error>;
    async fn get_session(&self, id: &str) -> Result<Option<Session>, sqlx::Error>;
    async fn delete_session(&self, id: &str) -> Result<(), sqlx::Error>;

    async fn create_device(&self, id: &str, user_id: &str, name: &str, now: i64) -> Result<(), sqlx::Error>;
    async fn list_devices(&self, user_id: &str) -> Result<Vec<Device>, sqlx::Error>;
    async fn get_device(&self, id: &str) -> Result<Option<Device>, sqlx::Error>;
    async fn delete_device(&self, id: &str) -> Result<(), sqlx::Error>;

    async fn issue_token(&self, token: &str, device_id: &str, now: i64) -> Result<(), sqlx::Error>;
    async fn lookup_token(&self, token: &str) -> Result<Option<DeviceToken>, sqlx::Error>;
    async fn list_valid_tokens(&self) -> Result<Vec<String>, sqlx::Error>;
    async fn revoke_token(&self, token: &str) -> Result<(), sqlx::Error>;

    async fn upsert_pin(&self, device_id: &str, pin: &str, value: &str, now: i64) -> Result<(), sqlx::Error>;
    async fn get_pin(&self, device_id: &str, pin: &str) -> Result<Option<PinState>, sqlx::Error>;
    async fn list_pins(&self, device_id: &str) -> Result<Vec<PinState>, sqlx::Error>;
    async fn insert_history(&self, device_id: &str, pin: &str, value: &str, ts: i64) -> Result<(), sqlx::Error>;
    async fn query_history(&self, device_id: &str, pin: &str, from: i64, to: i64, limit: i64) -> Result<Vec<PinHistory>, sqlx::Error>;

    async fn create_dashboard(&self, id: &str, user_id: &str, name: &str, now: i64) -> Result<(), sqlx::Error>;
    async fn list_dashboards(&self, user_id: &str) -> Result<Vec<Dashboard>, sqlx::Error>;
    async fn update_dashboard(&self, id: &str, name: &str) -> Result<(), sqlx::Error>;
    async fn delete_dashboard(&self, id: &str) -> Result<(), sqlx::Error>;
    async fn create_widget(&self, id: &str, dashboard_id: &str, kind: &str, pin: &str, config: &str) -> Result<(), sqlx::Error>;
    async fn list_widgets(&self, dashboard_id: &str) -> Result<Vec<Widget>, sqlx::Error>;

    async fn enqueue_mail(&self, to: &str, subject: &str, body: &str, now: i64) -> Result<i64, sqlx::Error>;
    async fn claim_mail_batch(&self, limit: i64, now: i64) -> Result<Vec<MailItem>, sqlx::Error>;
    async fn mark_mail_sent(&self, id: i64) -> Result<(), sqlx::Error>;
    async fn mark_mail_retry(&self, id: i64, attempts: i64, next_try: i64) -> Result<(), sqlx::Error>;
    async fn mail_pending_count(&self) -> Result<i64, sqlx::Error>;

    async fn create_rule(&self, r: &Rule) -> Result<(), sqlx::Error>;
    async fn list_rules(&self, user_id: &str) -> Result<Vec<Rule>, sqlx::Error>;
    async fn list_rules_for_pin(&self, device_id: &str, pin: &str) -> Result<Vec<Rule>, sqlx::Error>;

    async fn set_status(&self, device_id: &str, online: bool, now: i64) -> Result<(), sqlx::Error>;
    async fn get_status(&self, device_id: &str) -> Result<Option<DeviceStatus>, sqlx::Error>;
}

pub struct PostgresStub;

#[allow(async_fn_in_trait)]
impl PostgresStub {
    pub async fn not_configured() -> Result<(), sqlx::Error> {
        Err(sqlx::Error::Configuration("postgres adapter belum dikonfigurasi".into()))
    }
}

pub fn now_unix() -> i64 {
    chrono::Utc::now().timestamp()
}
