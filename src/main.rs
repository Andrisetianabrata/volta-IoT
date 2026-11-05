use std::sync::Arc;

use volta::{auth, broker, cli::Args, config::AppConfig, http, logo, mailer, rule, seed, storage};
use clap::Parser;
use tracing_subscriber::{EnvFilter, prelude::*};

fn init_tracing(data_folder: &std::path::Path, log_level: &str) {
    let filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(log_level))
        .unwrap_or_else(|_| EnvFilter::new("info"));
    let file_appender =
        tracing_appender::rolling::daily(data_folder.join("logs"), "volta.log");
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
    if logo::supports_color() && std::io::IsTerminal::is_terminal(&std::io::stdout()) {
        println!("{}", logo::banner_colored());
    } else {
        println!("{}", logo::BANNER);
    }
    std::fs::create_dir_all(&args.data_folder)?;
    let config = AppConfig::load(&args.resolved_config_path())?;
    init_tracing(&args.data_folder, &config.server.log_level);

    let db_path = config.db_path(&args.data_folder);
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let db_path_str = db_path.to_string_lossy().to_string();
    let db = Arc::new(storage::sqlite::SqliteStorage::new(&db_path_str, config.storage.busy_timeout_ms).await?);

    // Seed akun admin bawaan (idempoten, dilewati bila email sudah ada).
    match auth::seed_admin(db.as_ref()).await {
        Ok(true) => tracing::info!("seed admin admin@admin.com siap"),
        Ok(false) => {}
        Err(e) => tracing::warn!("seed admin gagal: {e}"),
    }

    // Seed board demo hanya bila diminta eksplisit (pengembangan UI).
    if std::env::var("VOLTA_SEED_DEMO").as_deref() == Ok("1") {
        match seed::seed_demo(db.as_ref()).await {
            Ok(true) => tracing::info!("seed demo: board contoh dibuat"),
            Ok(false) => {}
            Err(e) => tracing::warn!("seed demo gagal: {e}"),
        }
    }

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

    let bridge_db = db.clone();
    let bridge_bus = state.bus.clone();
    let bridge_cmds = state.cmds.clone();
    let bridge_cache = broker::bridge::new_token_cache();
    if let Ok(tokens) = broker::bridge::load_valid_tokens(db.as_ref()).await {
        *bridge_cache.write().unwrap() = tokens;
    }
    let bridge_port = config.mqtt.local_port;
    tokio::spawn(broker::bridge::run_bridge(
        bridge_db,
        bridge_bus,
        bridge_cmds,
        bridge_port,
        bridge_cache,
    ));

    let app = http::router(state.clone());
    let addr = format!("0.0.0.0:{}", config.http.https_port);
    tracing::info!(
        data_folder = %args.data_folder.display(),
        mqtt_local = config.mqtt.local_port,
        mqtt_tls = config.mqtt.tls_port,
        https = config.http.https_port,
        "volta starting"
    );
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("cannot bind {addr}: {e} (port dipakai? ubah [http] https_port di server.toml)"))?;
    axum::serve(listener, app).await?;
    Ok(())
}
