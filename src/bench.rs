use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use std::time::{Duration, Instant};

use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

#[derive(Debug, Clone)]
pub struct BenchConfig {
    pub host: String,
    pub port: u16,
    pub path: String,
    pub duration: Duration,
    pub concurrency: usize,
}

impl Default for BenchConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 9443,
            path: "/healthz".to_string(),
            duration: Duration::from_secs(60),
            concurrency: 10,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct BenchReport {
    pub total: u64,
    pub errors: u64,
    pub elapsed_secs: f64,
    pub requests_per_minute: f64,
}

pub fn requests_per_minute(total: u64, elapsed_secs: f64) -> f64 {
    if elapsed_secs <= 0.0 {
        return 0.0;
    }
    total as f64 / elapsed_secs * 60.0
}

fn find_headers_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4)
        .position(|w| w == b"\r\n\r\n")
        .map(|p| p + 4)
}

fn content_length(headers: &[u8]) -> Option<usize> {
    let text = std::str::from_utf8(headers).ok()?;
    for line in text.lines().skip(1) {
        let (name, value) = line.split_once(':')?;
        if name.trim().eq_ignore_ascii_case("content-length") {
            return value.trim().parse().ok();
        }
    }
    None
}

async fn request_once(
    stream: &mut TcpStream,
    carry: &mut Vec<u8>,
    req: &[u8],
) -> Result<(), String> {
    stream.write_all(req).await.map_err(|e| e.to_string())?;
    loop {
        if let Some(end) = find_headers_end(carry) {
            let len = content_length(&carry[..end]).ok_or("tanpa content-length")?;
            let need = end + len;
            while carry.len() < need {
                let mut chunk = [0u8; 8192];
                let n = stream.read(&mut chunk).await.map_err(|e| e.to_string())?;
                if n == 0 {
                    return Err("koneksi ditutup".to_string());
                }
                carry.extend_from_slice(&chunk[..n]);
            }
            carry.drain(..need);
            return Ok(());
        }
        let mut chunk = [0u8; 8192];
        let n = stream.read(&mut chunk).await.map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("koneksi ditutup".to_string());
        }
        carry.extend_from_slice(&chunk[..n]);
    }
}

async fn worker(
    cfg: BenchConfig,
    deadline: Instant,
    done: Arc<AtomicU64>,
    failed: Arc<AtomicU64>,
) {
    let req = format!(
        "GET {} HTTP/1.1\r\nHost: {}\r\nConnection: keep-alive\r\n\r\n",
        cfg.path, cfg.host
    );
    let req = req.into_bytes();
    while Instant::now() < deadline {
        let mut stream = match TcpStream::connect((cfg.host.as_str(), cfg.port)).await {
            Ok(s) => s,
            Err(_) => {
                failed.fetch_add(1, Ordering::Relaxed);
                tokio::time::sleep(Duration::from_millis(50)).await;
                continue;
            }
        };
        let mut carry = Vec::new();
        while Instant::now() < deadline {
            match request_once(&mut stream, &mut carry, &req).await {
                Ok(()) => {
                    done.fetch_add(1, Ordering::Relaxed);
                }
                Err(_) => {
                    failed.fetch_add(1, Ordering::Relaxed);
                    break;
                }
            }
        }
    }
}

pub async fn run(cfg: BenchConfig) -> BenchReport {
    if cfg.duration.is_zero() || cfg.concurrency == 0 {
        return BenchReport {
            total: 0,
            errors: 0,
            elapsed_secs: 0.0,
            requests_per_minute: 0.0,
        };
    }
    let start = Instant::now();
    let deadline = start + cfg.duration;
    let done = Arc::new(AtomicU64::new(0));
    let failed = Arc::new(AtomicU64::new(0));
    let mut handles = Vec::with_capacity(cfg.concurrency);
    for _ in 0..cfg.concurrency {
        handles.push(tokio::spawn(worker(
            cfg.clone(),
            deadline,
            done.clone(),
            failed.clone(),
        )));
    }
    for h in handles {
        let _ = h.await;
    }
    let elapsed = start.elapsed().as_secs_f64();
    let total = done.load(Ordering::Relaxed);
    BenchReport {
        total,
        errors: failed.load(Ordering::Relaxed),
        elapsed_secs: elapsed,
        requests_per_minute: requests_per_minute(total, elapsed),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rpm_math() {
        assert_eq!(requests_per_minute(60, 60.0), 60.0);
        assert_eq!(requests_per_minute(120, 30.0), 240.0);
        assert_eq!(requests_per_minute(0, 60.0), 0.0);
        assert_eq!(requests_per_minute(10, 0.0), 0.0);
    }

    #[test]
    fn header_framing() {
        let raw = b"HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhello";
        let end = find_headers_end(raw).unwrap();
        assert_eq!(&raw[end..], b"hello");
        assert_eq!(content_length(&raw[..end]), Some(5));
        assert_eq!(find_headers_end(b"HTTP/1.1 200 OK\r\n"), None);
    }

    #[tokio::test]
    async fn zero_duration_no_requests() {
        let rep = run(BenchConfig {
            duration: Duration::from_secs(0),
            ..BenchConfig::default()
        })
        .await;
        assert_eq!(rep.total, 0);
    }

    #[tokio::test]
    async fn hits_local_server() {
        let app =
            axum::Router::new().route("/healthz", axum::routing::get(|| async { "ok" }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move { axum::serve(listener, app).await });
        let rep = run(BenchConfig {
            host: "127.0.0.1".to_string(),
            port,
            path: "/healthz".to_string(),
            duration: Duration::from_secs(1),
            concurrency: 2,
        })
        .await;
        assert!(rep.total > 0, "tidak ada request tercatat");
        assert!(rep.requests_per_minute > 0.0);
    }
}
