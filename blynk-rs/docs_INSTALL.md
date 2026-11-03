# Install Blynk RS

## Build

```sh
cd blynk-rs
cargo build --release
./target/release/blynk-rs --data-folder ./data
```

Port: 1883 MQTT lokal, 8883 MQTT TLS (via reverse proxy / rumqttd), 9443 HTTP app.

## Config

`data/server.toml`:

```toml
[server]
log_level = "info"
[mqtt]
local_port = 1883
tls_port = 8883
[http]
https_port = 9443
[storage]
busy_timeout_ms = 5000
db_file = "blynk.db"
```

`data/mailer.toml`:

```toml
[smtp]
host = "smtp.example.com"
port = 587
tls = "starttls"
username = "no-reply@example.com"
password = "REPLACE_ME"
from = "\"Blynk RS\" <no-reply@example.com>"
[queue]
max = 10000
```

## ACME

Set `acme.enabled=true` bila domain publik siap. Uji staging dulu:

- staging: `https://acme-staging-v02.api.letsencrypt.org/directory`
- prod: `https://acme-v02.api.letsencrypt.org/directory`

Fungsi `acme::directory_url()` diuji membedakan keduanya.
