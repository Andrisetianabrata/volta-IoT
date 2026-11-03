pub mod error;

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State, WebSocketUpgrade},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::auth;
use crate::mailer;
use crate::pins::{command::{CmdRequest, CommandBus}, PinBus};
use crate::stats::Stats;
use crate::storage::{now_unix, sqlite::SqliteStorage, Storage};

use crate::http::error::ApiError;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<SqliteStorage>,
    pub bus: PinBus,
    pub cmds: Arc<CommandBus>,
    pub stats: Arc<Stats>,
    pub mailer: Option<Arc<mailer::Mailer>>,
    pub mailer_cfg: mailer::MailerConfig,
    pub ota: crate::ota::SharedOta,
}

impl AppState {
    pub fn new(db: Arc<SqliteStorage>, mailer_cfg: mailer::MailerConfig) -> Self {
        let mailer = mailer::Mailer::new(&mailer_cfg).ok().map(Arc::new);
        Self {
            db,
            bus: PinBus::default(),
            cmds: Arc::new(CommandBus::new(1024)),
            stats: Arc::new(Stats::new()),
            mailer,
            mailer_cfg,
            ota: Arc::new(crate::ota::OtaManager::default()),
        }
    }
}

fn bearer(headers: &HeaderMap) -> Result<String, ApiError> {
    let v = headers.get("authorization").ok_or_else(|| ApiError::unauthorized("missing bearer"))?;
    let s = v.to_str().map_err(|_| ApiError::unauthorized("bad auth header"))?;
    s.strip_prefix("Bearer ").map(|t| t.to_string()).ok_or_else(|| ApiError::unauthorized("bad scheme"))
}

async fn uid(state: &AppState, headers: &HeaderMap) -> Result<String, ApiError> {
    let tok = bearer(headers)?;
    auth::user_id_for_session(state.db.as_ref(), &tok).await.map_err(|_| ApiError::unauthorized("invalid session"))
}

#[derive(Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct IdBody {
    pub user_id: String,
}

async fn register(State(s): State<Arc<AppState>>, Json(b): Json<RegisterBody>) -> Result<impl IntoResponse, ApiError> {
    let id = auth::register(s.db.as_ref(), &b.email, &b.password).await.map_err(|e| match e {
        auth::AuthError::Exists => ApiError::new(StatusCode::CONFLICT, "EXISTS", e.to_string()),
        _ => ApiError::bad_request("INVALID", e.to_string()),
    })?;
    let (subj, body) = mailer::render_register("VOLTA.", &id);
    let _ = s.db.enqueue_mail(&b.email, &subj, &body, now_unix()).await;
    Ok((StatusCode::CREATED, Json(IdBody { user_id: id })))
}

#[derive(Serialize)]
pub struct TokenBody {
    pub token: String,
}

async fn login(State(s): State<Arc<AppState>>, Json(b): Json<RegisterBody>) -> Result<impl IntoResponse, ApiError> {
    let t = auth::login(s.db.as_ref(), &b.email, &b.password).await.map_err(|_| ApiError::unauthorized("kredensial salah"))?;
    s.stats.inc_logins();
    Ok(Json(TokenBody { token: t }))
}

#[derive(Deserialize)]
pub struct DashboardBody {
    pub name: String,
}

async fn list_dashboards(State(s): State<Arc<AppState>>, headers: HeaderMap) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    Ok(Json(s.db.list_dashboards(&u).await?))
}

async fn create_dashboard(State(s): State<Arc<AppState>>, headers: HeaderMap, Json(b): Json<DashboardBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let id = uuid::Uuid::new_v4().to_string();
    s.db.create_dashboard(&id, &u, &b.name, now_unix()).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({"id": id}))))
}

async fn update_dashboard(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(b): Json<DashboardBody>) -> Result<impl IntoResponse, ApiError> {
    let _ = uid(&s, &headers).await?;
    s.db.update_dashboard(&id, &b.name).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn delete_dashboard(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let _ = uid(&s, &headers).await?;
    s.db.delete_dashboard(&id).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

#[derive(Deserialize)]
pub struct DeviceBody {
    pub name: String,
}

async fn list_devices(State(s): State<Arc<AppState>>, headers: HeaderMap) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    Ok(Json(s.db.list_devices(&u).await?))
}

async fn create_device(State(s): State<Arc<AppState>>, headers: HeaderMap, Json(b): Json<DeviceBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let (id, token) = crate::storage::devices::create_device_with_token(s.db.as_ref(), &u, &b.name).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({"device_id": id, "token": token}))))
}

async fn delete_device(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    s.db.delete_device(&id).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn list_pins(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    Ok(Json(s.db.list_pins(&id).await?))
}

async fn get_pin(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, pin)): Path<(String, String)>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    let p = s.db.get_pin(&id, &pin).await?.ok_or_else(|| ApiError::not_found("pin tidak ada"))?;
    Ok(Json(p))
}

#[derive(Deserialize)]
pub struct PinValue {
    pub value: String,
}

async fn put_pin(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, pin)): Path<(String, String)>, Json(b): Json<PinValue>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    s.cmds.send(CmdRequest { device_id: id.clone(), pin: pin.clone(), value: b.value.clone() }, std::time::Duration::from_secs(2)).await.map_err(|e| ApiError::bad_request("CMD_TIMEOUT", e))?;
    s.stats.inc_cmds();
    Ok(Json(serde_json::json!({"ok": true})))
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub from: Option<i64>,
    pub to: Option<i64>,
    pub limit: Option<i64>,
}

async fn history(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, pin)): Path<(String, String)>, Query(q): Query<HistoryQuery>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    let rows = s.db.query_history(&id, &pin, q.from.unwrap_or(0), q.to.unwrap_or(i64::MAX), q.limit.unwrap_or(500).min(5000)).await?;
    Ok(Json(rows))
}

async fn stream(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, ws: WebSocketUpgrade) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    let mut rx = s.bus.subscribe();
    Ok(ws.on_upgrade(move |mut socket| async move {
        use axum::extract::ws::Message;
        let _ = socket.send(Message::Text(format!("connected {id}"))).await;
        while let Ok(ev) = rx.recv().await {
            if ev.device_id != id {
                continue;
            }
            let line = serde_json::json!({"pin": ev.pin, "value": ev.value}).to_string();
            if socket.send(Message::Text(line)).await.is_err() {
                break;
            }
        }
    }))
}

async fn healthz(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    let mail_ok = if let Some(m) = &s.mailer { m.test_connection().await } else { false };
    let pending = s.db.mail_pending_count().await.unwrap_or(-1);
    Json(serde_json::json!({
        "broker": {"local_port": 1883, "tls_port": 8883},
        "db": {"ok": true},
        "mailer": {"ok": mail_ok, "pending": pending},
        "stats": s.stats.snapshot(),
    }))
}

async fn admin_stats(State(s): State<Arc<AppState>>, headers: HeaderMap) -> Result<impl IntoResponse, ApiError> {
    let _ = uid(&s, &headers).await?;
    Ok(Json(s.stats.snapshot()))
}

#[derive(Deserialize)]
pub struct WidgetBody {
    pub kind: String,
    pub pin: String,
    pub config: Option<String>,
}

async fn list_widgets(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let _ = uid(&s, &headers).await?;
    Ok(Json(s.db.list_widgets(&id).await?))
}

async fn create_widget(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(b): Json<WidgetBody>) -> Result<impl IntoResponse, ApiError> {
    let _ = uid(&s, &headers).await?;
    let wid = uuid::Uuid::new_v4().to_string();
    s.db.create_widget(&wid, &id, &b.kind, &b.pin, b.config.as_deref().unwrap_or("{}")).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({"id": wid}))))
}

#[derive(Deserialize)]
pub struct OtaBody {
    pub url: String,
    pub version: String,
}

async fn ota_start(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(b): Json<OtaBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    let job = s.ota.start(&id, &b.url, &b.version).await;
    let payload = crate::ota::OtaManager::cmd_payload(&job);
    s.cmds.send(CmdRequest { device_id: id, pin: "ota".into(), value: payload }, std::time::Duration::from_secs(2)).await.map_err(|e| ApiError::bad_request("CMD_TIMEOUT", e))?;
    Ok(Json(serde_json::json!({"ok": true, "version": job.version})))
}

async fn ota_stop(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    let dev = s.db.get_device(&id).await?.ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    if dev.user_id != u {
        return Err(ApiError::not_found("device tidak ada"));
    }
    s.ota.stop(&id).await;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn favicon() -> impl IntoResponse {
    (
        [(axum::http::header::CONTENT_TYPE, "image/x-icon")],
        include_bytes!("../../assets/logo/favicon.ico"),
    )
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/dashboards", get(list_dashboards).post(create_dashboard))
        .route("/dashboards/:id", put(update_dashboard).delete(delete_dashboard))
        .route("/dashboards/:id/widgets", get(list_widgets).post(create_widget))
        .route("/devices", get(list_devices).post(create_device))
        .route("/devices/:id", delete(delete_device))
        .route("/devices/:id/pins", get(list_pins))
        .route("/devices/:id/pins/:pin", get(get_pin).put(put_pin))
        .route("/devices/:id/history/:pin", get(history))
        .route("/devices/:id/stream", get(stream))
        .route("/healthz", get(healthz))
        .route("/admin/stats", get(admin_stats))
        .route("/devices/:id/ota/start", post(ota_start))
        .route("/devices/:id/ota/stop", post(ota_stop))
        .route("/favicon.ico", get(favicon))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    async fn app() -> Router {
        let db = Arc::new(SqliteStorage::new(":memory:", 5000).await.unwrap());
        let state = Arc::new(AppState::new(db, mailer::MailerConfig::default()));
        router(state)
    }

    #[tokio::test]
    async fn register_login_and_health() {
        let a = app().await;
        let r = a.clone().oneshot(Request::builder().uri("/auth/register").method("POST").header("content-type", "application/json").body(Body::from(r#"{"email":"t@x.co","password":"password123"}"#)).unwrap()).await.unwrap();
        assert_eq!(r.status(), StatusCode::CREATED);
        let r = a.clone().oneshot(Request::builder().uri("/healthz").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn error_shape_is_consistent() {
        let a = app().await;
        let r = a.oneshot(Request::builder().uri("/devices").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(r.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn favicon_served() {
        let a = app().await;
        let r = a.oneshot(Request::builder().uri("/favicon.ico").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
        assert_eq!(r.headers()["content-type"], "image/x-icon");
    }
}
