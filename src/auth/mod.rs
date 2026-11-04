pub mod token;

use sha2::{Digest, Sha256};

use crate::storage::{now_unix, Storage};

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("email sudah terdaftar")]
    Exists,
    #[error("kredensial salah")]
    Invalid,
    #[error("sesi kedaluwarsa")]
    Expired,
    #[error("db: {0}")]
    Db(#[from] sqlx::Error),
}

pub fn hash_password(email: &str, password: &str) -> String {
    let mut h = Sha256::new();
    h.update(email.to_lowercase().as_bytes());
    h.update(b":");
    h.update(password.as_bytes());
    hex::encode(h.finalize())
}

pub async fn register<S: Storage>(db: &S, email: &str, password: &str) -> Result<String, AuthError> {
    let email = email.trim().to_lowercase();
    if !email.contains('@') || password.len() < 8 {
        return Err(AuthError::Invalid);
    }
    if db.get_user_by_email(&email).await?.is_some() {
        return Err(AuthError::Exists);
    }
    let uid = uuid::Uuid::new_v4().to_string();
    db.create_user(&uid, &email, &hash_password(&email, password), now_unix()).await?;
    Ok(uid)
}

pub async fn login<S: Storage>(db: &S, email: &str, password: &str) -> Result<String, AuthError> {
    let email = email.trim().to_lowercase();
    let user = db.get_user_by_email(&email).await?.ok_or(AuthError::Invalid)?;
    if user.pass_hash != hash_password(&email, password) {
        return Err(AuthError::Invalid);
    }
    let sid = uuid::Uuid::new_v4().to_string();
    let now = now_unix();
    db.create_session(&sid, &user.id, now, now + 30 * 86400).await?;
    Ok(sid)
}

pub async fn user_id_for_session<S: Storage>(db: &S, session: &str) -> Result<String, AuthError> {
    let s = db.get_session(session).await?.ok_or(AuthError::Invalid)?;
    if s.expires_at < now_unix() {
        return Err(AuthError::Expired);
    }
    Ok(s.user_id)
}

/// Akun admin bawaan untuk instalasi baru. Idempoten: tidak diubah bila
/// email sudah terdaftar. Mengembalikan true bila seed dibuat sekarang.
pub async fn seed_admin<S: Storage>(db: &S) -> Result<bool, AuthError> {
    if db.get_user_by_email("admin@admin.com").await?.is_some() {
        return Ok(false);
    }
    register(db, "admin@admin.com", "admin123").await?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use crate::storage::sqlite::SqliteStorage;

    use super::*;

    #[tokio::test]
    async fn seed_admin_idempotent() {
        let db = SqliteStorage::new(":memory:", 5000).await.unwrap();
        assert!(seed_admin(&db).await.unwrap());
        assert!(!seed_admin(&db).await.unwrap());
        assert!(login(&db, "admin@admin.com", "admin123").await.is_ok());
    }

    #[tokio::test]
    async fn register_login_roundtrip() {
        let db = SqliteStorage::new(":memory:", 5000).await.unwrap();
        register(&db, "u@x.co", "password123").await.unwrap();
        assert!(register(&db, "u@x.co", "password123").await.is_err());
        let sid = login(&db, "u@x.co", "password123").await.unwrap();
        assert!(user_id_for_session(&db, &sid).await.is_ok());
        assert!(login(&db, "u@x.co", "wrongpass1").await.is_err());
    }
}
