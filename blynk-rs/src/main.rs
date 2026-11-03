use std::sync::Arc;

use clap::Parser;
use tracing_subscriber::{EnvFilter, prelude::*};

mod acme;
mod auth;
mod broker;
mod cli;
mod config;
mod http;
mod mailer;
mod ota;
mod pins;
mod rule;
mod stats;
mod storage;

use cli::Args;
use config::AppConfig;

fn init_tracing(data_folder: &std::path::Path, log_level: &str) {
    let filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(log_level))
        .unwrap_or_else(|_| EnvFilter::new("info"));
    let file_appender =
        tracing_appender::rolling::daily(data_folder.join("logs"), "blynk-rs.log");
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);
    Box::leak(Box::new(guard));
    let _ = tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout))
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(file_writer)
                .with_ansi(false),
        )
        .try_init();
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    std::fs::create_dir_all(&args.data_folder)?;
    let config = AppConfig::load(&args.resolved_config_path())?;
    init_tracing(&args.data_folder, &config.server.log_level);

    let db_path = config.db_path(&args.data_folder);
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let db_path_str = db_path.to_string_lossy().to_string();
    let db = Arc::new(storage::sqlite::SqliteStorage::new(&db_path_str, config.storage.busy_timeout_ms).await?);

    let mailer_cfg = mailer::MailerConfig::load(&args.data_folder.join("mailer.toml"));
    let state = Arc::new(http::AppState::new(db.clone(), mailer_cfg.clone()));

    if let Some(m) = state.mailer.clone() {
        let dbc = db.clone();
        tokio::spawn(mailer::run_worker(dbc, m, mailer_cfg.max_queue));
    }

    let rule_db = db.clone();
    let rule_bus = state.bus.clone();
    let rule_cmds = state.cmds.clone();
    tokio::spawn(rule::run(rule_db, rule_bus, rule_cmds));

    let app = http::router(state.clone());
    let addr = format!("0.0.0.0:{}", config.http.https_port);
    tracing::info!(
        data_folder = %args.data_folder.display(),
        mqtt_local = config.mqtt.local_port,
        mqtt_tls = config.mqtt.tls_port,
        https = config.http.https_port,
        "blynk-rs starting"
    );
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
