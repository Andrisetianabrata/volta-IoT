# Perencanaan Blynk RS: Ulang Bangun MQTT-Only di Rust

## Ringkasan

Membangun ulang Blynk server sebagai server MQTT-only di Rust. Tidak ada protokol binary TCP legacy. Hardware berbicara MQTT, server menyimpan state pin di SQLite, aplikasi baru mengambil data lewat HTTPS REST dan WebSocket. Mailer SMTP wajib jalan sejak Fase 1, bukan fitur sampingan.

Folder project: `blynk-rs/`. Source Java lama dipakai sebagai daftar fitur saja, protokolnya dibuang.

Verifikasi pustaka via Context7: rumqttd dapat diembed dengan `LinkBuilder` sejak 0.16 dan mendukung TLS serta QoS2; sqlx tidak menyalakan WAL otomatis sehingga `journal_mode(Wal)` harus diset eksplisit; lettre punya `AsyncSmtpTransport::starttls_relay` dan `test_connection()`; axum punya `Path` extractor dan `WebSocketUpgrade`; `rustls-acme` menangani sertifikat Let's Encrypt otomatis.

## Keputusan Arsitektur

1. **rumqttd diembed sebagai broker di dalam proses Rust.** Server menyadap dan memasukkan pesan lewat `LinkBuilder` (LinkRx/LinkTx). Tidak ada broker eksternal, satu biner, deploy sederhana. TLS broker diset di config rumqttd.
2. **Topik MQTT desain baru:**
   - `blynk/dev/{device_id}/state/{pin}`: device publish ke server, QoS 1, retained
   - `blynk/dev/{device_id}/cmd/{pin}`: server publish perintah ke device, device subscribe topicnya sendiri, QoS 1, tidak retained
   - `blynk/dev/{device_id}/status`: retained online/offline, diset lewat LWT saat connect
   - `blynk/dev/{device_id}/log`: device publish pesan untuk widget terminal, QoS 0
   - ACL: satu device hanya boleh publish `state` dan `log` miliknya, dan hanya subscribe `cmd` serta `status` miliknya.
3. **Auth device lewat token.** Username MQTT = device token 32 karakter, password = token yang sama atau secret kedua. Token yang direvoke di DB memutus koneksi aktif.
4. **App baru via HTTPS REST dan WebSocket di Axum.** Header `Authorization: Bearer <session>`. Body JSON dengan `error.code` dan `error.message` konsisten di semua endpoint.
5. **SQLite default via sqlx, WAL eksplisit.** Satu pool writer, busy timeout. Trait `Storage` agar adapter Postgres bisa ditambah belakangan tanpa menyentuh handler.
6. **Mailer wajib di Fase 1.** Crate `lettre`, transport `AsyncSmtpTransport::starttls_relay` port 587 atau `from_url("smtps://user:pass@host")` port 465. Config di `mailer.toml`. Antrean async dengan retry dan backoff. Template email register, reset password, dan event pin. `test_connection()` dipanggil di health endpoint.
7. **Runtime dan pendukung: Tokio, clap, tracing, serde, flate2 bila perlu arsip. ACME otomatis via `rustls-acme`.**
8. **Server sebagai hub.** Client app tidak langsung ke broker MQTT. Device punya jalur MQTT, app punya jalur HTTP, server menjembatani supaya auth tinggal satu lapisan.

## Kontrak HTTP draft

- `POST /auth/register`, body `{email, password}`, email konfirmasi dikirim oleh mailer
- `POST /auth/login`, return `{token}`
- `GET /dashboards`, `POST /dashboards`, `PUT /dashboards/{id}`, `DELETE /dashboards/{id}`
- `POST /devices`, return device_id dan token; `GET /devices`; `DELETE /devices/{id}`
- `GET /devices/{id}/pins`, state semua pin
- `GET /devices/{id}/pins/{pin}`, state satu pin
- `PUT /devices/{id}/pins/{pin}`, publish ke topic `cmd`
- `GET /devices/{id}/history/{pin}?from&to`, deret data
- `WS /devices/{id}/stream`, pesan pin real-time
- `GET /healthz`, status broker, DB, mailer
- Error seragam: `400 {"error":{"code":"...","message":"..."}}`

## Task List

### Fase 1: Fondasi dan mailer wajib

- [ ] Task 1: Scaffolding crate, config, CLI, tracing
- [ ] Task 2: Skema SQLite dan trait Storage
- [ ] Task 3: Token manager dan registry device
- [ ] Task 4: Mailer lettre wajib jalan

**Checkpoint 1:** `cargo build` dan `cargo test` lulus, migrasi DB berjalan, email terkirim lewat SMTP STARTTLS, `healthz` melaporkan status mailer.

### Fase 2: MQTT hardware

- [ ] Task 5: rumqttd embedded, port 1883 lokal dan 8883 TLS
- [ ] Task 6: auth token device dan LWT status
- [ ] Task 7: sadap state pin ke DB dan retained
- [ ] Task 8: perintah cmd ke device dengan timeout

**Checkpoint 2:** device uji (rumqttc) login, publish state, terima cmd, status online/offline terbaca di `healthz`.

### Fase 3: App API

- [ ] Task 9: REST auth register, login, session
- [ ] Task 10: CRUD dashboard, device, widget
- [ ] Task 11: WebSocket stream pin dan history

**Checkpoint 3:** app baru register, login, dan membaca pin live via WS.

### Fase 4: Rule dan operasi

- [ ] Task 12: Rule engine eventor dan timer
- [ ] Task 13: Statistik admin dan health
- [ ] Task 14: OTA via topic cmd
- [ ] Task 15: Paket release, dokumentasi install, uji ACME

**Checkpoint 4:** semua kriteria di rincian task terpenuhi.

## Rincian Task Fase 1 dan 2

### Task 1: Scaffolding crate, config, CLI, tracing

Deskripsi: crate `blynk-rs/` dengan `Cargo.toml`, modul `config`, `cli`, shared state, dan sinonim kosong untuk broker, mailer, http, storage yang akan datang. clap menangani `-dataFolder`, `-config`. tracing ke stdout dan file.

Kriteria:
- [ ] `cargo build` lulus, `cargo clippy -- -D warnings` lulus
- [ ] satu file config TOML di data folder terbaca
- [ ] nilai default config cocok dengan plan

Verifikasi: `cargo test` lulus, jalankan biner mencetak log.

Berkas: `Cargo.toml`, `src/main.rs`, `src/config.rs`, `src/cli.rs`. Estimasi: S. Dependensi: tidak ada.

### Task 2: Skema SQLite dan trait Storage

Deskripsi: tabel `users`, `sessions`, `devices`, `device_tokens`, `pin_state`, `pin_history`, `dashboards`, `dashboard_widgets`, `mail_queue`. Migrasi via `sqlx::migrate!`. Trait `Storage` async. WAL, busy timeout, satu writer pool.

Kriteria:
- [ ] migrasi membuat semua tabel
- [ ] CRUD tiap tabel ada unit test
- [ ] trait menyembunyikan driver, adapter Postgres disiapkan sebagai stub kontrak

Verifikasi: `cargo test` lulus.

Berkas: `src/storage/mod.rs`, `src/storage/sqlite.rs`, `migrations/`. Estimasi: M. Dependensi: Task 1.

### Task 3: Token manager

Deskripsi: generator token 32 karakter, pemetaan token ke device, fungsi issue, revoke, lookup, dan pemutusan koneksi saat revoke.

Kriteria: unit test token unik, revoke mengakhiri sesi aktif.

Berkas: `src/storage/devices.rs`, `src/auth/token.rs`. Estimasi: S. Dependensi: Task 2.

### Task 4: Mailer lettre wajib jalan

Deskripsi: modul `mailer` dengan struct `Mailer`, config `mailer.toml` atau env var, transport `starttls_relay` atau `from_url` smtps, antrean `mail_queue` di DB, worker tokio dengan batas antrean dan backoff, template register, reset password, event pin, dan hook ke auth maupun rules.

Kriteria:
- [ ] email terkirim berulang ke SMTP uji
- [ ] kegagalan SMTP masuk backoff, worker tidak berhenti
- [ ] `test_connection()` dipanggil `healthz`
- [ ] antrean antrean dibatasi `mail_queue.max` dan flush saat boot

Verifikasi: `cargo test` untuk queue logic, satu pengiriman nyata untuk mati-matiannya SMTP.

Berkas: `src/mailer/mod.rs`, `src/mailer/templates/`, `migrations/*mail_queue*`. Estimasi: M. Dependensi: Task 2.

### Task 5: rumqttd embedded

Deskripsi: embed rumqttd dengan config listener 1883 (lokal) dan 8883 TLS, setup `LinkBuilder`, pin versi rumqttd di `Cargo.toml`.

Kriteria:
- [ ] klien rumqttc connect lokal
- [ ] TLS handshake berhasil dengan CA sendiri
- [ ] Link menerima publish dan bisa mengirim ke topik

Verifikasi: integrasi test dengan rumqttc dan mosquitto_pub.

Berkas: `src/broker/mod.rs`, `config/broker.toml`. Estimasi: M. Dependensi: Task 1.

### Task 6: auth token device dan LWT status

Deskripsi: hook auth MQTT: username = device token, verifikasi dari DB, LWT topik `status` retained offline, event connect menulis status online dan device_id.

Kriteria: token salah ditolak, revoke menutup sesi, status online/offline terbaca.

Verifikasi: integrasi test.

Berkas: `src/broker/auth.rs`. Estimasi: S. Dependensi: Task 3, Task 5.

### Task 7: sadap state pin ke DB

Deskripsi: subscribe Link `dev/{device_id}/state/{pin}`, parse nilai angka atau string, upsert `pin_state`, insert `pin_history`, baca retained setelah restart server.

Kriteria: publish uji terbaca di `pin_state`, restart server memuat retained terakhir.

Verifikasi: integrasi test.

Berkas: `src/pins/state.rs`. Estimasi: M. Dependensi: Task 5, Task 6.

### Task 8: perintah cmd ke device

Deskripsi: `CommandBus` publish `dev/{device_id}/cmd/{pin}` QoS 1, ukur ack dan timeout, retry terbatas, catat metric.

Kriteria: device uji menerima cmd, timeout masuk metric, retry terkecil.

Verifikasi: integrasi test.

Berkas: `src/pins/command.rs`. Estimasi: S. Dependensi: Task 7.

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| API `LinkBuilder` rumqttd berubah antar versi | broker rusak saat upgrade | pin versi di Cargo.toml, uji integrasi di CI |
| ACL broker belum cukup kuat | device tulis topik lain | semua pemrosesan lewat Link, server bukan passthrough; topic prefix dipenuhi kode |
| WAL lock di banyak device | data tertunda lama | satu writer pool, busy_timeout, uji concurrent publish |
| Kontrak app belum final | fitur app berbalik desain | kontrak draft di atas, ubah saat Fase 3 setelah kebutuhan app baru jelas |
| Perangkat tidak mengirim ak/ping | cmd tak pernah diterima | timeout dan metric, device uji harus mengirm pub ack |

## Pertanyaan Terbuka

1. MQTT versi final: 3.1.1 saja cukup, atau 5 juga?
2. TLS device: self-signed CA yang didistribusikan saat provisioning, atau sertifikat server ACME?
3. Session app: JWT stateless atau session stateful di DB?
4. Nama biner: `blynk-rs`, `blynkd`, atau lain?
