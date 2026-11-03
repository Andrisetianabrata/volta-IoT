use rand::Rng;
use tokio::sync::RwLock;

use crate::storage::{now_unix, Storage};

const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

pub fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    (0..32).map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char).collect()
}

#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("token tidak dikenal")]
    Unknown,
    #[error("token direvoke")]
    Revoked,
    #[error("db: {0}")]
    Db(#[from] sqlx::Error),
}

pub async fn issue_for_device<S: Storage>(db: &S, device_id: &str) -> Result<String, sqlx::Error> {
    let t = generate_token();
    db.issue_token(&t, device_id, now_unix()).await?;
    Ok(t)
}

pub async fn validate<S: Storage>(db: &S, token: &str, live: &RwLock<std::collections::HashSet<String>>) -> Result<String, TokenError> {
    if token.len() != 32 {
        return Err(TokenError::Unknown);
    }
    if live.read().await.contains(token) && live.read().await.contains(&format!("revoked:{token}")) {
        return Err(TokenError::Revoked);
    }
    let rec = db.lookup_token(token).await.map_err(TokenError::Db)?.ok_or(TokenError::Unknown)?;
    if rec.revoked != 0 {
        return Err(TokenError::Revoked);
    }
    Ok(rec.device_id)
}

pub async fn revoke<S: Storage>(db: &S, token: &str, live: &RwLock<std::collections::HashSet<String>>) -> Result<(), sqlx::Error> {
    db.revoke_token(token).await?;
    live.write().await.insert(format!("revoked:{token}"));
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::storage::sqlite::SqliteStorage;

    use super::*;

    #[test]
    fn token_is_32_alnum() {
        for _ in 0..50 {
            let t = generate_token();
            assert_eq!(t.len(), 32);
            assert!(t.bytes().all(|b| b.is_ascii_alphanumeric()));
        }
    }

    #[tokio::test]
    async fn issue_validate_revoke() {
        let db = SqliteStorage::new(":memory:", 5000).await.unwrap();
        let now = now_unix();
        db.create_user("u1", "a@b.c", "h", now).await.unwrap();
        db.create_device("d1", "u1", "esp", now).await.unwrap();
        let live = RwLock::new(std::collections::HashSet::new());
        let t = issue_for_device(&db, "d1").await.unwrap();
        assert_eq!(validate(&db, &t, &live).await.unwrap(), "d1");
        revoke(&db, &t, &live).await.unwrap();
        assert!(matches!(validate(&db, &t, &live).await, Err(TokenError::Revoked)));
    }
}
