use crate::auth::token;
use crate::storage::{now_unix, Storage};

pub async fn create_device_with_token<S: Storage>(
    db: &S,
    user_id: &str,
    name: &str,
) -> Result<(String, String), sqlx::Error> {
    let dev = uuid::Uuid::new_v4().to_string();
    db.create_device(&dev, user_id, name, now_unix()).await?;
    let tok = token::issue_for_device(db, &dev).await?;
    Ok((dev, tok))
}
