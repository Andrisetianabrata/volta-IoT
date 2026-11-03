use std::sync::Arc;
use std::time::Duration;

use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use serde::{Deserialize, Serialize};

use crate::storage::{now_unix, Storage};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct MailerConfig {
    pub host: String,
    pub port: u16,
    pub tls: String,
    pub username: String,
    pub password: String,
    pub from: String,
    pub max_queue: usize,
}

impl Default for MailerConfig {
    fn default() -> Self {
        Self {
            host: "localhost".into(),
            port: 587,
            tls: "starttls".into(),
            username: String::new(),
            password: String::new(),
            from: "\"VOLTA.\" <no-reply@localhost>".into(),
            max_queue: 10000,
        }
    }
}

impl MailerConfig {
    pub fn load(path: &std::path::Path) -> Self {
        let Ok(text) = std::fs::read_to_string(path) else { return Self::default() };
        toml::from_str::<MailerFile>(&text).map(|f| f.into_config()).unwrap_or_default()
    }
}

#[derive(Debug, Deserialize)]
struct MailerFile {
    #[serde(default)]
    smtp: MailerConfig,
    #[serde(default)]
    queue: QueueFile,
}

impl MailerFile {
    fn into_config(mut self) -> MailerConfig {
        if let Some(m) = self.queue.max {
            self.smtp.max_queue = m;
        }
        self.smtp
    }
}

#[derive(Debug, Default, Deserialize)]
struct QueueFile {
    max: Option<usize>,
}

pub fn render_register(app: &str, link: &str) -> (String, String) {
    (format!("[{app}] konfirmasi pendaftaran"), format!("Klik tautan berikut untuk verifikasi:\n{link}\n"))
}

pub fn render_reset(app: &str, link: &str) -> (String, String) {
    (format!("[{app}] reset password"), format!("Reset password lewat tautan:\n{link}\n"))
}

pub fn render_pin_event(device: &str, pin: &str, value: &str) -> (String, String) {
    (format!("Event {device}/{pin}"), format!("Nilai terbaru {pin} pada {device}: {value}\n"))
}

pub fn backoff_secs(attempts: i64) -> i64 {
    (30 * 2_i64.pow(attempts.clamp(0, 7) as u32)).min(3600)
}

pub struct Mailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

impl Mailer {
    pub fn new(cfg: &MailerConfig) -> Result<Self, lettre::transport::smtp::Error> {
        let builder = if cfg.tls == "smtps" || cfg.port == 465 {
            AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.host)?
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&cfg.host)?
        };
        let mut b = builder.port(cfg.port);
        if !cfg.username.is_empty() {
            b = b.credentials(Credentials::new(cfg.username.clone(), cfg.password.clone()));
        }
        Ok(Self { transport: b.build(), from: cfg.from.parse().unwrap_or_else(|_| "no-reply@localhost".parse().unwrap()) })
    }

    pub async fn test_connection(&self) -> bool {
        self.transport.test_connection().await.unwrap_or(false)
    }

    pub async fn send_raw(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        let addr: lettre::Address = to.parse().map_err(|e| format!("bad to: {e}"))?;
        let msg = Message::builder()
            .from(self.from.clone())
            .to(addr.into())
            .subject(subject)
            .body(body.to_string())
            .map_err(|e| format!("build: {e}"))?;
        self.transport.send(msg).await.map(|_| ()).map_err(|e| e.to_string())
    }
}

pub async fn run_worker<S: Storage + 'static>(db: Arc<S>, mailer: Arc<Mailer>, max_queue: usize) {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    loop {
        interval.tick().await;
        let now = now_unix();
        let Ok(batch) = db.claim_mail_batch(20, now).await else { continue };
        for item in batch {
            if mailer.send_raw(&item.to_addr, &item.subject, &item.body).await.is_ok() {
                let _ = db.mark_mail_sent(item.id).await;
            } else {
                let attempts = item.attempts + 1;
                let _ = db.mark_mail_retry(item.id, attempts, now + backoff_secs(attempts)).await;
            }
        }
        if let Ok(pending) = db.mail_pending_count().await {
            if pending as usize > max_queue {
                tracing::warn!(pending, max_queue, "antrean mail meluap");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_contain_link() {
        let (s, b) = render_register("VOLTA.", "http://x/verify");
        assert!(s.contains("VOLTA."));
        assert!(b.contains("http://x/verify"));
    }

    #[test]
    fn backoff_caps_at_one_hour() {
        assert_eq!(backoff_secs(0), 30);
        assert_eq!(backoff_secs(10), 3600);
    }

    #[test]
    fn default_config_matches_readme() {
        let c = MailerConfig::default();
        assert_eq!(c.port, 587);
        assert_eq!(c.max_queue, 10000);
    }
}
