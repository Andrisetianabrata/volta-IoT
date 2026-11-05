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
pub struct StreamQuery {
    pub token: Option<String>,
}

/// Cakupan tautan share terbuka: board + device yang terikat widget-nya.
/// Share bersifat terbuka (lihat + kontrol), tanpa peran read-only/branding/kuota.
struct ShareScope {
    dashboard_id: String,
    devices: Vec<String>,
}

async fn share_scope(db: &SqliteStorage, token: &str) -> Result<ShareScope, ApiError> {
    let sh = db
        .get_share(token)
        .await
        .map_err(|_| ApiError::not_found("tautan tidak valid"))?
        .ok_or_else(|| ApiError::not_found("tautan tidak valid"))?;
    let widgets = db
        .list_widgets(&sh.dashboard_id)
        .await
        .map_err(|_| ApiError::not_found("tautan tidak valid"))?;
    let mut devices = Vec::new();
    for w in &widgets {
        if let Ok(cfg) = serde_json::from_str::<serde_json::Value>(&w.config) {
            if let Some(d) = cfg.get("device").and_then(|v| v.as_str()) {
                if !d.is_empty() && !devices.iter().any(|x| x == d) {
                    devices.push(d.to_string());
                }
            }
        }
    }
    Ok(ShareScope { dashboard_id: sh.dashboard_id, devices })
}

/// Aktor pengakses device: pemilik (sesi login) atau pemegang tautan share.
enum Actor {
    User(String),
    Share(ShareScope),
}

async fn actor(state: &AppState, headers: &HeaderMap, query_token: Option<&str>) -> Result<Actor, ApiError> {
    if let Ok(tok) = bearer(headers) {
        if let Ok(u) = auth::user_id_for_session(state.db.as_ref(), &tok).await {
            return Ok(Actor::User(u));
        }
        if let Ok(scope) = share_scope(state.db.as_ref(), &tok).await {
            return Ok(Actor::Share(scope));
        }
        return Err(ApiError::unauthorized("invalid session"));
    }
    if let Some(t) = query_token.filter(|t| !t.is_empty()) {
        if let Ok(scope) = share_scope(state.db.as_ref(), t).await {
            return Ok(Actor::Share(scope));
        }
        return Err(ApiError::unauthorized("invalid session"));
    }
    Err(ApiError::unauthorized("missing bearer"))
}

async fn check_device(state: &AppState, actor: &Actor, id: &str) -> Result<(), ApiError> {
    let dev = state
        .db
        .get_device(id)
        .await?
        .ok_or_else(|| ApiError::not_found("device tidak ada"))?;
    match actor {
        Actor::User(u) => {
            if dev.user_id != *u {
                return Err(ApiError::not_found("device tidak ada"));
            }
        }
        Actor::Share(scope) => {
            if !scope.devices.iter().any(|d| d == id) {
                return Err(ApiError::not_found("device tidak ada"));
            }
        }
    }
    Ok(())
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

async fn owned_dashboard(
    db: &SqliteStorage,
    user_id: &str,
    dashboard_id: &str,
) -> Result<crate::storage::Dashboard, ApiError> {
    let d = db
        .get_dashboard(dashboard_id)
        .await?
        .ok_or_else(|| ApiError::not_found("dashboard tidak ada"))?;
    if d.user_id != user_id {
        return Err(ApiError::not_found("dashboard tidak ada"));
    }
    Ok(d)
}

const MAX_WIDGET_CONFIG_LEN: usize = 65536;

fn check_widget_config(config: &str) -> Result<(), ApiError> {
    if config.len() > MAX_WIDGET_CONFIG_LEN {
        return Err(ApiError::bad_request("CONFIG_TOO_LARGE", "config melebihi 64 KB"));
    }
    serde_json::from_str::<serde_json::Value>(config)
        .map(|_| ())
        .map_err(|_| ApiError::bad_request("INVALID_CONFIG", "config harus JSON valid"))
}

async fn update_dashboard(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(b): Json<DashboardBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    s.db.update_dashboard(&id, &b.name).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn delete_dashboard(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    s.db.delete_share_by_dashboard(&id).await?;
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
    let a = actor(&s, &headers, None).await?;
    check_device(&s, &a, &id).await?;
    Ok(Json(s.db.list_pins(&id).await?))
}

async fn get_pin(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, pin)): Path<(String, String)>) -> Result<impl IntoResponse, ApiError> {
    let a = actor(&s, &headers, None).await?;
    check_device(&s, &a, &id).await?;
    let p = s.db.get_pin(&id, &pin).await?.ok_or_else(|| ApiError::not_found("pin tidak ada"))?;
    Ok(Json(p))
}

#[derive(Deserialize)]
pub struct PinValue {
    pub value: String,
}

async fn put_pin(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, pin)): Path<(String, String)>, Json(b): Json<PinValue>) -> Result<impl IntoResponse, ApiError> {
    let a = actor(&s, &headers, None).await?;
    check_device(&s, &a, &id).await?;
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
    let a = actor(&s, &headers, None).await?;
    check_device(&s, &a, &id).await?;
    let rows = s.db.query_history(&id, &pin, q.from.unwrap_or(0), q.to.unwrap_or(i64::MAX), q.limit.unwrap_or(500).min(5000)).await?;
    Ok(Json(rows))
}

async fn stream(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Query(q): Query<StreamQuery>, ws: WebSocketUpgrade) -> Result<impl IntoResponse, ApiError> {
    let a = actor(&s, &headers, q.token.as_deref()).await?;
    check_device(&s, &a, &id).await?;
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
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    Ok(Json(s.db.list_widgets(&id).await?))
}

async fn create_widget(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>, Json(b): Json<WidgetBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    let cfg = b.config.as_deref().unwrap_or("{}");
    check_widget_config(cfg)?;
    let wid = uuid::Uuid::new_v4().to_string();
    s.db.create_widget(&wid, &id, &b.kind, &b.pin, cfg).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({"id": wid}))))
}

#[derive(Deserialize)]
pub struct UpdateWidgetBody {
    pub kind: Option<String>,
    pub pin: Option<String>,
    pub config: Option<String>
}

async fn update_widget(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, wid)): Path<(String, String)>, Json(b): Json<UpdateWidgetBody>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    let w = s.db.get_widget(&wid).await?.filter(|w| w.dashboard_id == id).ok_or_else(|| ApiError::not_found("widget tidak ada"))?;
    let kind = b.kind.as_deref().unwrap_or(&w.kind);
    let pin = b.pin.as_deref().unwrap_or(&w.pin);
    let cfg = b.config.as_deref().unwrap_or(&w.config);
    check_widget_config(cfg)?;
    s.db.update_widget(&wid, kind, pin, cfg).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

async fn delete_widget(State(s): State<Arc<AppState>>, headers: HeaderMap, Path((id, wid)): Path<(String, String)>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    s.db.get_widget(&wid).await?.filter(|w| w.dashboard_id == id).ok_or_else(|| ApiError::not_found("widget tidak ada"))?;
    s.db.delete_widget(&wid).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

/// Buat (atau ambil yang ada) tautan share terbuka untuk satu board.
/// Satu board = satu tautan; pemilik mengelola, siapa pun yang login bisa buka.
async fn create_share(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    if let Some(sh) = s.db.get_share_by_dashboard(&id).await? {
        return Ok((StatusCode::OK, Json(serde_json::json!({"token": sh.token}))));
    }
    let token = uuid::Uuid::new_v4().simple().to_string();
    s.db.create_share(&token, &id, now_unix()).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({"token": token}))))
}

async fn get_share_state(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    let sh = s
        .db
        .get_share_by_dashboard(&id)
        .await?
        .ok_or_else(|| ApiError::not_found("belum dibagikan"))?;
    Ok(Json(serde_json::json!({"token": sh.token})))
}

async fn delete_share(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let u = uid(&s, &headers).await?;
    owned_dashboard(s.db.as_ref(), &u, &id).await?;
    s.db.delete_share_by_dashboard(&id).await?;
    Ok(Json(serde_json::json!({"ok": true})))
}

/// Board publik via tautan (halaman /s/ di webapp mewajibkan login;
/// respons ini sendiri tanpa user_id pemilik).
async fn public_board(State(s): State<Arc<AppState>>, Path(token): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let scope = share_scope(s.db.as_ref(), &token).await?;
    let dash = s
        .db
        .get_dashboard(&scope.dashboard_id)
        .await?
        .ok_or_else(|| ApiError::not_found("tautan tidak valid"))?;
    let widgets = s.db.list_widgets(&scope.dashboard_id).await?;
    let mut devices = Vec::new();
    for d in &scope.devices {
        if let Ok(Some(dev)) = s.db.get_device(d).await {
            devices.push(serde_json::json!({"id": dev.id, "name": dev.name}));
        }
    }
    Ok(Json(serde_json::json!({
        "dashboard": {"id": dash.id, "name": dash.name},
        "widgets": widgets,
        "devices": devices,
    })))
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

async fn device_status(State(s): State<Arc<AppState>>, headers: HeaderMap, Path(id): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let a = actor(&s, &headers, None).await?;
    check_device(&s, &a, &id).await?;
    let st = s.db.get_status(&id).await?;
    Ok(Json(serde_json::json!({
        "online": st.as_ref().map(|x| x.online != 0).unwrap_or(false),
        "updated_at": st.map(|x| x.updated_at),
    })))
}

async fn dashboard() -> impl IntoResponse {
    (
        [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
        include_str!("../../dashboard.html"),
    )
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/", get(dashboard))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/dashboards", get(list_dashboards).post(create_dashboard))
        .route("/dashboards/:id", put(update_dashboard).delete(delete_dashboard))
        .route("/dashboards/:id/widgets", get(list_widgets).post(create_widget))
        .route("/dashboards/:id/widgets/:wid", put(update_widget).delete(delete_widget))
        .route("/dashboards/:id/share", post(create_share).get(get_share_state).delete(delete_share))
        .route("/share/:token", get(public_board))
        .route("/devices", get(list_devices).post(create_device))
        .route("/devices/:id", delete(delete_device))
        .route("/devices/:id/status", get(device_status))
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

    #[tokio::test]
    async fn dashboard_index_serves_html() {
        let a = app().await;
        let r = a.oneshot(Request::builder().uri("/").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
        assert!(r.headers()["content-type"].to_str().unwrap().starts_with("text/html"));
        let b = axum::body::to_bytes(r.into_body(), 1024 * 1024).await.unwrap();
        let s = String::from_utf8(b.to_vec()).unwrap();
        assert!(s.contains("id=\"canvas\""));
        assert!(s.contains("VOLTA."));
    }

    #[tokio::test]
    async fn actor_rejects_missing_or_invalid_credentials() {
        let db = Arc::new(SqliteStorage::new(":memory:", 5000).await.unwrap());
        let state = Arc::new(AppState::new(db, mailer::MailerConfig::default()));
        // tanpa kredensial apa pun
        assert!(actor(&state, &HeaderMap::new(), None).await.is_err());
        // bearer ngawur
        let mut h = HeaderMap::new();
        h.insert("authorization", "Bearer ngawur".parse().unwrap());
        assert!(actor(&state, &h, None).await.is_err());
        // query token ngawur
        assert!(actor(&state, &HeaderMap::new(), Some("ngawur")).await.is_err());
        // jalur positif (sesi → User, share → Share) tercakup di test HTTP
        // widget_crud_enforces_ownership dan share_token_opens_board_scoped_to_its_devices.
    }

    async fn authed(a: &Router, email: &str) -> String {
        let reg = Request::builder().uri("/auth/register").method("POST").header("content-type", "application/json").body(Body::from(format!(r#"{{"email":"{email}","password":"password123"}}"#))).unwrap();
        let r = a.clone().oneshot(reg).await.unwrap();
        assert_eq!(r.status(), StatusCode::CREATED);
        let login = Request::builder().uri("/auth/login").method("POST").header("content-type", "application/json").body(Body::from(format!(r#"{{"email":"{email}","password":"password123"}}"#))).unwrap();
        let r = a.clone().oneshot(login).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
        let b = axum::body::to_bytes(r.into_body(), 4096).await.unwrap();
        serde_json::from_slice::<serde_json::Value>(&b).unwrap()["token"].as_str().unwrap().to_string()
    }

    async fn call(a: &Router, method: &str, uri: &str, token: Option<&str>, body: Option<serde_json::Value>) -> (StatusCode, serde_json::Value) {
        let mut b = Request::builder().uri(uri).method(method);
        if let Some(t) = token {
            b = b.header("authorization", format!("Bearer {t}"));
        }
        let body = match body {
            Some(v) => b.header("content-type", "application/json").body(Body::from(v.to_string())).unwrap(),
            None => b.body(Body::empty()).unwrap(),
        };
        let r = a.clone().oneshot(body).await.unwrap();
        let status = r.status();
        let bytes = axum::body::to_bytes(r.into_body(), 1024 * 1024).await.unwrap_or_default();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
        (status, json)
    }

    #[tokio::test]
    async fn widget_crud_enforces_ownership() {
        let a = app().await;
        let (t1, t2) = (authed(&a, "w1@x.co").await, authed(&a, "w2@x.co").await);
        let (_, db) = call(&a, "POST", "/dashboards", Some(&t1), Some(serde_json::json!({"name":"d1"}))).await;
        let did = db["id"].as_str().unwrap().to_string();

        let (s, w) = call(&a, "POST", &format!("/dashboards/{did}/widgets"), Some(&t1), Some(serde_json::json!({"kind":"Gauge","pin":"V0","config":"{}"}))).await;
        assert_eq!(s, StatusCode::CREATED);
        let wid = w["id"].as_str().unwrap().to_string();

        let (s, _) = call(&a, "GET", &format!("/dashboards/{did}/widgets"), Some(&t2), None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);
        let (s, _) = call(&a, "PUT", &format!("/dashboards/{did}/widgets/{wid}"), Some(&t2), Some(serde_json::json!({"pin":"V1"}))).await;
        assert_eq!(s, StatusCode::NOT_FOUND);
        let (s, _) = call(&a, "DELETE", &format!("/dashboards/{did}/widgets/{wid}"), Some(&t2), None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);

        let (s, _) = call(&a, "PUT", &format!("/dashboards/{did}/widgets/{wid}"), Some(&t1), Some(serde_json::json!({"pin":"V1","config":"{\"max\":100}"}))).await;
        assert_eq!(s, StatusCode::OK);
        let (s, list) = call(&a, "GET", &format!("/dashboards/{did}/widgets"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        assert_eq!(list.as_array().unwrap().len(), 1);
        assert_eq!(list[0]["pin"], "V1");
        assert_eq!(list[0]["kind"], "Gauge");

        let (s, _) = call(&a, "DELETE", &format!("/dashboards/{did}/widgets/{wid}"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        let (s, list) = call(&a, "GET", &format!("/dashboards/{did}/widgets"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        assert!(list.as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn share_token_opens_board_scoped_to_its_devices() {
        let a = app().await;
        let (t1, t2) = (authed(&a, "s1@x.co").await, authed(&a, "s2@x.co").await);
        // device milik t1
        let (_, dd) = call(&a, "POST", "/devices", Some(&t1), Some(serde_json::json!({"name":"d1"}))).await;
        let dev = dd["device_id"].as_str().unwrap().to_string();
        // device lain milik t1, TIDAK diikat ke board
        let (_, dd2) = call(&a, "POST", "/devices", Some(&t1), Some(serde_json::json!({"name":"d2"}))).await;
        let dev2 = dd2["device_id"].as_str().unwrap().to_string();
        // board + widget mengikat dev
        let (_, db) = call(&a, "POST", "/dashboards", Some(&t1), Some(serde_json::json!({"name":"b1"}))).await;
        let did = db["id"].as_str().unwrap();
        let cfg = format!("{{\"device\":\"{dev}\"}}");
        let (s, _) = call(&a, "POST", &format!("/dashboards/{did}/widgets"), Some(&t1), Some(serde_json::json!({"kind":"gauge","pin":"t1","config":cfg}))).await;
        assert_eq!(s, StatusCode::CREATED);

        // pemilik lain tidak bisa share board ini
        let (s, _) = call(&a, "POST", &format!("/dashboards/{did}/share"), Some(&t2), None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);

        // buat share: idempoten, token sama bila dipanggil ulang
        let (s, sh) = call(&a, "POST", &format!("/dashboards/{did}/share"), Some(&t1), None).await;
        assert!(s == StatusCode::CREATED || s == StatusCode::OK);
        let tok = sh["token"].as_str().unwrap().to_string();
        let (s, sh2) = call(&a, "POST", &format!("/dashboards/{did}/share"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        assert_eq!(sh2["token"].as_str().unwrap(), tok);
        let (s, st) = call(&a, "GET", &format!("/dashboards/{did}/share"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        assert_eq!(st["token"].as_str().unwrap(), tok);

        // publik tanpa sesi bisa baca board+widget+device, tanpa user_id pemilik
        let (s, pb) = call(&a, "GET", &format!("/share/{tok}"), None, None).await;
        assert_eq!(s, StatusCode::OK);
        assert_eq!(pb["dashboard"]["id"].as_str().unwrap(), did);
        assert!(pb["dashboard"].get("user_id").is_none());
        assert_eq!(pb["widgets"].as_array().unwrap().len(), 1);
        assert_eq!(pb["devices"].as_array().unwrap().len(), 1);
        assert_eq!(pb["devices"][0]["id"].as_str().unwrap(), dev);

        // token share berlaku sebagai bearer untuk device dalam cakupan
        let (s, pins) = call(&a, "GET", &format!("/devices/{dev}/pins"), Some(&tok), None).await;
        assert_eq!(s, StatusCode::OK);
        assert!(pins.as_array().unwrap().is_empty());
        let (s, _) = call(&a, "GET", &format!("/devices/{dev}/status"), Some(&tok), None).await;
        assert_eq!(s, StatusCode::OK);
        let (s, _) = call(&a, "GET", &format!("/devices/{dev}/history/t1?from=0&to=9999999999"), Some(&tok), None).await;
        assert_eq!(s, StatusCode::OK);

        // device di luar cakupan tetap 404 walau token share valid
        let (s, _) = call(&a, "GET", &format!("/devices/{dev2}/pins"), Some(&tok), None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);

        // token ngawur tetap 401
        let (s, _) = call(&a, "GET", &format!("/devices/{dev}/pins"), Some("ngawur"), None).await;
        assert_eq!(s, StatusCode::UNAUTHORIZED);
        let (s, _) = call(&a, "GET", "/share/ngawur", None, None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);

        // cabut: publik + bearer share ikut mati
        let (s, _) = call(&a, "DELETE", &format!("/dashboards/{did}/share"), Some(&t1), None).await;
        assert_eq!(s, StatusCode::OK);
        let (s, _) = call(&a, "GET", &format!("/share/{tok}"), None, None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);
        let (s, _) = call(&a, "GET", &format!("/devices/{dev}/pins"), Some(&tok), None).await;
        assert_eq!(s, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn dashboard_update_delete_enforce_ownership() {
        let a = app().await;
        let (t1, t2) = (authed(&a, "o1@x.co").await, authed(&a, "o2@x.co").await);
        let (_, db) = call(&a, "POST", "/dashboards", Some(&t1), Some(serde_json::json!({"name":"d1"}))).await;
        let did = db["id"].as_str().unwrap();
        let (s, _) = call(&a, "PUT", &format!("/dashboards/{did}"), Some(&t2), Some(serde_json::json!({"name":"x"}))).await;
        assert_eq!(s, StatusCode::NOT_FOUND);
        let (s, _) = call(&a, "DELETE", &format!("/dashboards/{did}"), Some(&t2), None).await;
        assert_eq!(s, StatusCode::NOT_FOUND);
        let (s, _) = call(&a, "PUT", &format!("/dashboards/{did}"), Some(&t1), Some(serde_json::json!({"name":"baru"}))).await;
        assert_eq!(s, StatusCode::OK);
    }

    #[tokio::test]
    async fn widget_config_must_be_json_and_capped() {
        let a = app().await;
        let t = authed(&a, "v@x.co").await;
        let (_, db) = call(&a, "POST", "/dashboards", Some(&t), Some(serde_json::json!({"name":"d1"}))).await;
        let did = db["id"].as_str().unwrap().to_string();
        let url = format!("/dashboards/{did}/widgets");
        let (s, _) = call(&a, "POST", &url, Some(&t), Some(serde_json::json!({"kind":"Gauge","pin":"V0","config":"bukan-json"}))).await;
        assert_eq!(s, StatusCode::BAD_REQUEST);
        let big = "x".repeat(65537);
        let (s, _) = call(&a, "POST", &url, Some(&t), Some(serde_json::json!({"kind":"html","pin":"","config": big}))).await;
        assert_eq!(s, StatusCode::BAD_REQUEST);
        let ok_cfg = serde_json::json!({"kind":"html","pin":"","config":"{\"a\":1}"});
        let (s, _) = call(&a, "POST", &url, Some(&t), Some(ok_cfg)).await;
        assert_eq!(s, StatusCode::CREATED);
    }

    #[tokio::test]
    async fn device_status_reports_offline_by_default() {
        let a = app().await;
        let reg = Request::builder().uri("/auth/register").method("POST").header("content-type", "application/json").body(Body::from(r#"{"email":"s@x.co","password":"password123"}"#)).unwrap();
        let r = a.clone().oneshot(reg).await.unwrap();
        assert_eq!(r.status(), StatusCode::CREATED);
        let login = Request::builder().uri("/auth/login").method("POST").header("content-type", "application/json").body(Body::from(r#"{"email":"s@x.co","password":"password123"}"#)).unwrap();
        let r = a.clone().oneshot(login).await.unwrap();
        let b = axum::body::to_bytes(r.into_body(), 4096).await.unwrap();
        let tok = serde_json::from_slice::<serde_json::Value>(&b).unwrap()["token"].as_str().unwrap().to_string();
        let auth = format!("Bearer {tok}");
        let mk = Request::builder().uri("/devices").method("POST").header("content-type", "application/json").header("authorization", auth.clone()).body(Body::from(r#"{"name":"d1"}"#)).unwrap();
        let r = a.clone().oneshot(mk).await.unwrap();
        assert_eq!(r.status(), StatusCode::CREATED);
        let b = axum::body::to_bytes(r.into_body(), 4096).await.unwrap();
        let id = serde_json::from_slice::<serde_json::Value>(&b).unwrap()["device_id"].as_str().unwrap().to_string();
        let st = Request::builder().uri(format!("/devices/{id}/status")).header("authorization", auth).body(Body::empty()).unwrap();
        let r = a.clone().oneshot(st).await.unwrap();
        assert_eq!(r.status(), StatusCode::OK);
        let b = axum::body::to_bytes(r.into_body(), 4096).await.unwrap();
        let v: serde_json::Value = serde_json::from_slice(&b).unwrap();
        assert_eq!(v["online"], false);
    }
}
