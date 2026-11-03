use tokio::sync::RwLock;

use crate::auth::token;
use crate::storage::Storage;

pub async fn authenticate_device<S: Storage>(
    db: &S,
    username: &str,
    live: &RwLock<std::collections::HashSet<String>>,
) -> Result<String, token::TokenError> {
    let device_id = token::validate(db, username, live).await?;
    live.write().await.insert(username.to_string());
    Ok(device_id)
}

pub async fn on_disconnect(_device_id: &str, _live: &RwLock<std::collections::HashSet<String>>) {}

pub async fn mark_online<S: Storage>(db: &S, device_id: &str) {
    let _ = db.set_status(device_id, true, crate::storage::now_unix()).await;
}

pub async fn mark_offline<S: Storage>(db: &S, device_id: &str) {
    let _ = db.set_status(device_id, false, crate::storage::now_unix()).await;
}

pub fn lwt_payload(online: bool) -> &'static str {
    if online { "online" } else { "offline" }
}

#[cfg(test)]
mod tests {
    use crate::storage::sqlite::SqliteStorage;

    use super::*;

    #[tokio::test]
    async fn auth_rejects_bad_token() {
        let db = SqliteStorage::new(":memory:", 5000).await.unwrap();
        let live = RwLock::new(std::collections::HashSet::new());
        assert!(authenticate_device(&db, "short", &live).await.is_err());
    }
}
