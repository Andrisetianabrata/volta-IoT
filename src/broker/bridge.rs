use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use std::time::Duration;

use rumqttd::local::{LinkRx, LinkTx};
use rumqttd::{Broker, Config, ConnectionSettings, Notification, RouterConfig, ServerSettings};

use crate::pins::command::{CmdRequest, CommandBus};
use crate::pins::PinBus;
use crate::storage::sqlite::SqliteStorage;
use crate::storage::Storage;

pub type TokenCache = Arc<RwLock<HashSet<String>>>;

pub fn new_token_cache() -> TokenCache {
    Arc::new(RwLock::new(HashSet::new()))
}

pub async fn load_valid_tokens(db: &SqliteStorage) -> Result<HashSet<String>, sqlx::Error> {
    Ok(db.list_valid_tokens().await?.into_iter().collect())
}

pub fn build_broker_config(port: u16, cache: TokenCache) -> Config {
    let auth = Arc::new(move |_id: String, user: String, _pass: String| {
        cache.read().map(|c| c.contains(&user)).unwrap_or(false)
    });
    let mut v4 = HashMap::new();
    v4.insert(
        "1".to_string(),
        ServerSettings {
            name: "v4-1".to_string(),
            listen: format!("0.0.0.0:{port}").parse().unwrap(),
            tls: None,
            next_connection_delay_ms: 10,
            connections: ConnectionSettings {
                connection_timeout_ms: 10_000,
                max_payload_size: 1024 * 1024,
                max_inflight_count: 100,
                auth: None,
                external_auth: Some(auth),
                dynamic_filters: false,
            },
        },
    );
    Config {
        id: 0,
        router: RouterConfig {
            max_connections: 10010,
            max_outgoing_packet_count: 200,
            max_segment_size: 104_857_600,
            max_segment_count: 10,
            custom_segment: None,
            initialized_filters: None,
            shared_subscriptions_strategy: Default::default(),
        },
        v4: Some(v4),
        v5: None,
        ws: None,
        cluster: None,
        console: None,
        bridge: None,
        prometheus: None,
        metrics: None,
    }
}

pub fn start_broker(config: Config) -> Result<(LinkTx, LinkRx), String> {
    let mut broker = Broker::new(config);
    let links = broker.link("volta-bridge").map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let _ = broker.start();
    });
    Ok(links)
}

pub fn cmd_topic(req: &CmdRequest) -> String {
    super::cmd_topic(&req.device_id, &req.pin)
}

pub fn status_is_online(payload: &[u8]) -> bool {
    payload == b"online"
}

pub async fn run_bridge_loop(
    db: Arc<SqliteStorage>,
    bus: PinBus,
    cmds: Arc<CommandBus>,
    mut link_tx: LinkTx,
    mut link_rx: LinkRx,
) {
    let _ = link_tx.subscribe("volta/#");
    let mut cmd_rx = cmds.subscribe();
    loop {
        tokio::select! {
            res = link_rx.next() => {
                let Some(notif) = res.unwrap_or(None) else { break };
                if let Notification::Forward(f) = notif {
                    handle_forward(&db, &bus, &f.publish.topic, &f.publish.payload).await;
                }
            }
            res = cmd_rx.recv() => {
                if let Ok(req) = res {
                    let _ = link_tx.publish(cmd_topic(&req), req.value);
                }
            }
        }
    }
}

async fn handle_forward(db: &Arc<SqliteStorage>, bus: &PinBus, topic: &[u8], payload: &[u8]) {
    let Ok(topic) = std::str::from_utf8(topic) else { return };
    let Ok(payload) = std::str::from_utf8(payload) else { return };
    match super::parse_topic(topic) {
        Some(super::Topic::State { device, .. }) | Some(super::Topic::Log { device }) => {
            let _ = crate::pins::state::handle_publish(db, bus, &device, topic, payload).await;
        }
        Some(super::Topic::Status { device }) => {
            let _ = db
                .set_status(&device, status_is_online(payload.as_bytes()), crate::storage::now_unix())
                .await;
        }
        _ => {}
    }
}

pub async fn run_bridge(
    db: Arc<SqliteStorage>,
    bus: PinBus,
    cmds: Arc<CommandBus>,
    port: u16,
    cache: TokenCache,
) {
    {
        let db = db.clone();
        let cache = cache.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(30));
            loop {
                tick.tick().await;
                if let Ok(tokens) = load_valid_tokens(db.as_ref()).await {
                    if let Ok(mut c) = cache.write() {
                        *c = tokens;
                    }
                }
            }
        });
    }
    loop {
        let (link_tx, link_rx) = match start_broker(build_broker_config(port, cache.clone())) {
            Ok(l) => l,
            Err(e) => {
                tracing::error!(error = %e, "mqtt broker gagal start, coba lagi 5 dtk");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };
        tracing::info!(port, "mqtt broker jalan");
        run_bridge_loop(db.clone(), bus.clone(), cmds.clone(), link_tx, link_rx).await;
        tracing::error!("mqtt bridge berhenti, coba lagi 5 dtk");
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cmd_topic_format() {
        let req = CmdRequest {
            device_id: "d1".into(),
            pin: "V0".into(),
            value: "1".into(),
        };
        assert_eq!(cmd_topic(&req), "volta/dev/d1/cmd/V0");
    }

    #[test]
    fn status_payload_mapping() {
        assert!(status_is_online(b"online"));
        assert!(!status_is_online(b"offline"));
        assert!(!status_is_online(b"ONLINE"));
        assert!(!status_is_online(b""));
    }

    #[test]
    fn broker_config_carries_port_and_auth() {
        let cfg = build_broker_config(19883, new_token_cache());
        let v4 = cfg.v4.as_ref().unwrap();
        assert_eq!(v4["1"].listen.port(), 19883);
        assert!(v4["1"].connections.external_auth.is_some());
    }

    #[test]
    fn token_cache_allows_valid_only() {
        let cache = new_token_cache();
        cache.write().unwrap().insert("tok".to_string());
        assert!(cache.read().unwrap().contains("tok"));
        assert!(!cache.read().unwrap().contains("nope"));
    }

    #[tokio::test]
    async fn load_tokens_from_db() {
        let db = crate::storage::sqlite::SqliteStorage::new(":memory:", 5000)
            .await
            .unwrap();
        let now = crate::storage::now_unix();
        db.create_user("u1", "a@b.c", "h", now).await.unwrap();
        db.create_device("d1", "u1", "esp", now).await.unwrap();
        db.issue_token(&"t".repeat(32), "d1", now).await.unwrap();
        let set = load_valid_tokens(&db).await.unwrap();
        assert!(set.contains(&"t".repeat(32)));
        assert_eq!(set.len(), 1);
    }

    fn mqtt_str(s: &str, out: &mut Vec<u8>) {
        out.extend_from_slice(&(s.len() as u16).to_be_bytes());
        out.extend_from_slice(s.as_bytes());
    }

    fn mqtt_connect(client_id: &str, user: &str, pass: &str) -> Vec<u8> {
        let mut body = vec![0x00, 0x04, b'M', b'Q', b'T', b'T', 0x04, 0xC2, 0x00, 0x3C];
        mqtt_str(client_id, &mut body);
        mqtt_str(user, &mut body);
        mqtt_str(pass, &mut body);
        let mut pkt = vec![0x10, body.len() as u8];
        pkt.extend_from_slice(&body);
        pkt
    }

    fn mqtt_publish(topic: &str, payload: &[u8]) -> Vec<u8> {
        let mut body = Vec::new();
        mqtt_str(topic, &mut body);
        body.extend_from_slice(payload);
        let mut pkt = vec![0x30, body.len() as u8];
        pkt.extend_from_slice(&body);
        pkt
    }

    fn mqtt_subscribe(topic: &str) -> Vec<u8> {
        let mut body = vec![0x00, 0x01];
        mqtt_str(topic, &mut body);
        body.push(0x00);
        let mut pkt = vec![0x82, body.len() as u8];
        pkt.extend_from_slice(&body);
        pkt
    }

    async fn read_exact(stream: &mut tokio::net::TcpStream, n: usize, what: &str) -> Vec<u8> {
        use tokio::io::AsyncReadExt;
        let mut buf = vec![0u8; n];
        stream
            .read_exact(&mut buf)
            .await
            .unwrap_or_else(|e| panic!("gagal baca {what}: {e}"));
        buf
    }

    fn remaining_len(stream_body: &[u8]) -> usize {
        stream_body[0] as usize
    }

    #[tokio::test]
    async fn embedded_broker_end_to_end() {
        let db = Arc::new(
            crate::storage::sqlite::SqliteStorage::new(":memory:", 5000)
                .await
                .unwrap(),
        );
        let now = crate::storage::now_unix();
        db.create_user("u1", "a@b.c", "h", now).await.unwrap();
        db.create_device("d1", "u1", "esp", now).await.unwrap();
        let token = "t".repeat(32);
        db.issue_token(&token, "d1", now).await.unwrap();

        let cache = new_token_cache();
        cache.write().unwrap().insert(token.clone());
        let (link_tx, link_rx) = start_broker(build_broker_config(19883, cache)).unwrap();
        let bus = PinBus::default();
        let cmds = Arc::new(CommandBus::new(16));
        let db2 = db.clone();
        let bus2 = bus.clone();
        let cmds2 = cmds.clone();
        tokio::spawn(async move {
            run_bridge_loop(db2, bus2, cmds2, link_tx, link_rx).await;
        });
        tokio::time::sleep(Duration::from_millis(500)).await;

        let mut ok = tokio::net::TcpStream::connect("127.0.0.1:19883").await.unwrap();
        {
            use tokio::io::AsyncWriteExt;
            ok.write_all(&mqtt_connect("dev1", &token, &token)).await.unwrap();
        }
        let connack = read_exact(&mut ok, 4, "connack-ok").await;
        assert_eq!(connack, vec![0x20, 0x02, 0x00, 0x00]);

        let mut bad = tokio::net::TcpStream::connect("127.0.0.1:19883").await.unwrap();
        {
            use tokio::io::AsyncWriteExt;
            bad.write_all(&mqtt_connect("devX", &"z".repeat(32), &"z".repeat(32)))
                .await
                .unwrap();
        }
        {
            use tokio::io::AsyncReadExt;
            let mut buf = [0u8; 4];
            let res = tokio::time::timeout(Duration::from_secs(3), bad.read_exact(&mut buf)).await;
            if let Ok(Ok(_)) = res {
                assert_ne!(buf[3], 0x00, "token salah malah diterima");
            }
        }

        {
            use tokio::io::AsyncWriteExt;
            ok.write_all(&mqtt_publish("volta/dev/d1/state/V0", b"23.5"))
                .await
                .unwrap();
        }
        let mut got = None;
        for _ in 0..50 {
            if let Ok(Some(p)) = db.get_pin("d1", "V0").await {
                if p.value == "23.5" {
                    got = Some(p);
                    break;
                }
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        assert!(got.is_some(), "state tidak masuk DB");

        {
            use tokio::io::AsyncWriteExt;
            ok.write_all(&mqtt_subscribe("volta/dev/d1/cmd/V0")).await.unwrap();
        }
        let _ = read_exact(&mut ok, 5, "suback").await;
        cmds.send(
            CmdRequest { device_id: "d1".into(), pin: "V0".into(), value: "1".into() },
            Duration::from_secs(2),
        )
        .await
        .unwrap();
        let hdr = read_exact(&mut ok, 2, "pub-head").await;
        assert_eq!(hdr[0] & 0xF0, 0x30);
        let n = remaining_len(&hdr[1..]);
        let body = read_exact(&mut ok, n, "pub-body").await;
        let tlen = u16::from_be_bytes([body[0], body[1]]) as usize;
        assert_eq!(&body[2..2 + tlen], b"volta/dev/d1/cmd/V0");
        assert_eq!(&body[2 + tlen..], b"1");

        {
            use tokio::io::AsyncWriteExt;
            ok.write_all(&mqtt_publish("volta/dev/d1/status", b"offline"))
                .await
                .unwrap();
        }
        let mut off = false;
        for _ in 0..50 {
            if let Ok(Some(s)) = db.get_status("d1").await {
                if s.online == 0 {
                    off = true;
                    break;
                }
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        assert!(off, "status offline tidak tercatat");
    }
}
