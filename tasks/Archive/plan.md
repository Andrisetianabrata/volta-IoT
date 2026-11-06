# Perencanaan VOLTA.: MQTT-Only di Go

## Ringkasan

VOLTA. adalah server MQTT-only di Go. Tidak ada protokol binary TCP legacy. Hardware berbicara MQTT, server menyimpan state pin di SQLite, aplikasi baru mengambil data lewat HTTPS REST dan WebSocket. Mailer SMTP wajib jalan sejak Fase 1, bukan fitur sampingan.

Folder project: root repo (`go.mod`, `cmd/volta/main.go`, paket `config`, `http`, ...).

Migrasi dari Rust selesai: seluruh API dan fitur dipindahkan 1:1 ke Go tanpa sisa (31 route, 18 paket, 40+ tes). Kode Rust (`src/`, `Cargo.toml`, `Cargo.lock`, `migrations/` root, `target/`) telah dihapus.

Verifikasi pustaka: mochi-mqtt v2 diembed dengan `mqtt.New(&mqtt.Options{InlineClient:true})`, hook kustom (`OnConnectAuthenticate`, `OnACLCheck`, `OnPublish`, `OnDisconnect`) serta `server.Publish()` untuk injeksi perintah; mattn/go-sqlite3 dengan DSN `_journal_mode=WAL` + `_busy_timeout` eksplisit dan `SetMaxOpenConns(1)`; `net/smtp` untuk STARTTLS port 587 dan SMTPS port 465; `net/http` ServeMux (pola `"METODE /path/{param}"`) + `gorilla/websocket`; `BurntSushi/toml` untuk config; `google/uuid` untuk id.

## Keputusan Arsitektur

1. **mochi-mqtt diembed sebagai broker di dalam proses Go.** Hook `VoltaHook` mencegat auth, ACL, dan publish; perintah ke device diinjeksikan lewat `server.Publish()`. Tidak ada broker eksternal, satu biner, deploy sederhana. TLS device via reverse proxy; port dari `[mqtt]` di `server.toml`.
2. **Topik MQTT (tidak berubah dari kontrak lama):**
   - `volta/dev/{device_id}/state/{pin}`: device publish ke server, QoS 1, retained
   - `volta/dev/{device_id}/cmd/{pin}`: server publish perintah ke device, device subscribe topicnya sendiri, QoS 1, tidak retained
   - `volta/dev/{device_id}/status`: retained online/offline, diset lewat LWT/publish status saat connect
   - `volta/dev/{device_id}/log`: device publish pesan untuk widget terminal, QoS 0
   - ACL di `OnACLCheck`: satu device hanya boleh publish `state`, `log`, dan `status` miliknya, dan hanya subscribe `cmd` serta `status` miliknya.
3. **Auth device lewat token.** Username MQTT = device token 32 karakter. Token yang direvoke ditolak segera (cek DB per koneksi); token baru langsung berlaku via fallback DB bila belum ada di cache (cache 32-byte direfresh tiap 30 detik).
4. **App baru via HTTPS REST dan WebSocket di `net/http`.** Header `Authorization: Bearer <session>`. Body JSON dengan `error.code` dan `error.message` konsisten di semua endpoint.
5. **SQLite default via `database/sql` + mattn/go-sqlite3, WAL eksplisit.** Satu koneksi writer (`SetMaxOpenConns(1)`), busy timeout. Interface `Storage` agar adaptor Postgres bisa ditambah belakangan tanpa menyentuh handler.
6. **Mailer wajib di Fase 1.** `net/smtp`, STARTTLS port 587 atau TLS langsung port 465. Config di `mailer.toml`. Antrean async dengan retry dan backoff. Template email register, reset password, dan event pin. `TestConnection()` dipanggil di health endpoint.
7. **Runtime dan pendukung: Go, `flag`, `log`/`slog`, `encoding/json`, `bench` via `cmd/bench`. ACME: helper `directory_url` staging/prod, terminasi TLS di reverse proxy.**
8. **Server sebagai hub.** Client app tidak langsung ke broker MQTT. Device punya jalur MQTT, app punya jalur HTTP, server menjembatani supaya auth tinggal satu lapisan.

## Kontrak HTTP (final, terimplementasi 1:1 — 31 route)

- `POST /auth/register`, body `{email, password}`, email konfirmasi dikirim oleh mailer
- `POST /auth/login`, return `{token}`
- `GET /dashboards`, `POST /dashboards`, `PUT /dashboards/{id}`, `DELETE /dashboards/{id}`
- `GET /dashboards/{id}/widgets`, `POST ...`, `PUT .../{wid}`, `DELETE .../{wid}`
- `POST|GET|DELETE /dashboards/{id}/share`, `GET /share/{token}` (publik tanpa user_id)
- `POST /devices`, return device_id dan token; `GET /devices`; `DELETE /devices/{id}`
- `GET /devices/{id}/status`
- `GET /devices/{id}/pins`, state semua pin
- `GET /devices/{id}/pins/{pin}`, state satu pin
- `PUT /devices/{id}/pins/{pin}`, publish ke topic `cmd`
- `GET /devices/{id}/history/{pin}?from&to&limit`, deret data
- `WS /devices/{id}/stream` (`?token=` untuk share), pesan pin real-time
- `POST /devices/{id}/ota/start`, `POST .../ota/stop`
- `GET /healthz`, status broker, DB, mailer
- `GET /admin/stats`
- `GET /favicon.ico`, `GET /logo-horizontal.svg`, `GET /` (`{"name":"VOLTA.","version"}`)
- Error seragam: `{"error":{"code":"...","message":"..."}}`

## Task List

### Fase 1: Fondasi dan mailer wajib

- [x] Task 1: Scaffolding modul, config, CLI, logging
- [x] Task 2: Skema SQLite dan interface Storage
- [x] Task 3: Token manager dan registry device
- [x] Task 4: Mailer net/smtp wajib jalan

**Checkpoint 1:** `go build ./...` dan `go test ./...` lulus, migrasi DB berjalan, antrean mail bekerja, `healthz` melaporkan status mailer.

### Fase 2: MQTT hardware

- [x] Task 5: mochi-mqtt embedded, 1883 lokal (8883 TLS via reverse proxy)
- [x] Task 6: auth token device dan status online/offline
- [x] Task 7: sadap state pin ke DB dan retained
- [x] Task 8: perintah cmd ke device dengan timeout

**Checkpoint 2:** device uji login (CONNACK 0x00), publish state, terima cmd, status online/offline terbaca di DB dan `healthz`. Token salah ditolak (CONNACK 0x05).

### Fase 3: App API

- [x] Task 9: REST auth register, login, session
- [x] Task 10: CRUD dashboard, device, widget
- [x] Task 11: WebSocket stream pin dan history

**Checkpoint 3:** app baru register, login, dan membaca pin live via WS.

### Fase 4: Rule dan operasi

- [x] Task 12: Rule engine eventor dan timer
- [x] Task 13: Statistik admin dan health
- [x] Task 14: OTA via topic cmd
- [x] Task 15: Paket release, dokumentasi install

**Checkpoint 4:** semua kriteria di rincian task terpenuhi; smoke test biner (`register → login → device → MQTT state → pins/status → PUT cmd → cmd diterima device`) lolos.

### Fase 5: Berbagi terbuka (keputusan pemilik: open untuk semua)

Keputusan pemilik: TANPA read-only, TANPA branding, TANPA kuota/pricing.
Satu user bisa punya banyak board; tiap board punya satu tautan share
yang terbuka penuh (lihat + kontrol device) bagi siapa pun yang login.
S6 kuota dan S7 branding DIBATALKAN.

### S5: Berbagi board terbuka (wajib login, tanpa peran) — [x] selesai di Go

Deskripsi: tabel `shares(token PK, dashboard_id, created_at)`, satu
tautan per board. Endpoint publik `GET /share/{token}` membaca dashboard
+ widget + nama device (tanpa user_id pemilik). Token share berlaku
sebagai Bearer untuk pin/history/status/stream device-device yang
terikat widget board itu (lihat + kirim perintah). Tanpa peran viewer,
tanpa branding, tanpa kuota.

Kriteria:
- [x] `GET /share/{token}` tanpa sesi: board + widget + nama device, tanpa user_id
- [x] bearer share = cakupan device board itu saja (di luar cakupan → 404)
- [x] token salah/dicabut → 404/401, tidak bocor keberadaan dashboard
- [x] pemilik bisa cabut kapan saja, langsung tidak berlaku (board hapus ikut cabut)

Verifikasi: `go test ./http/` (buat → baca publik → cakupan → cabut → mati).

Berkas: `storage/migrations/0002_shares.sql`, `storage/*`, `http/http.go`.

### S6: Kuota paket — DIBATALKAN (open untuk semua, tanpa batas paket)

### S7: Branding per pelanggan — DIBATALKAN (satu brand VOLTA. untuk semua)

### Checkpoint 5

- [x] Berbagi terbuka jalan end-to-end (buat → buka wajib login → kontrol → cabut)
- [ ] S6/S7 tidak dibangun sesuai keputusan open

## Rincian Task Fase 1 dan 2 (jejak Go)

### Task 1: Scaffolding modul, config, CLI, logging

Deskripsi: modul `volta` di root repo dengan `go.mod`, paket `config`, `cli`, `logo`, shared state, dan paket broker, mailer, http, storage. `flag` menangani `-data-folder`, `--dataFolder`, `--config`. `log` ke stdout.

Kriteria:
- [x] `go build ./...` lulus, `go vet ./...` lulus, `gofmt` bersih
- [x] satu file config TOML di data folder terbaca
- [x] nilai default config cocok dengan plan

Verifikasi: `go test ./config/ ./cli/` lulus, jalankan biner mencetak banner.

Berkas: `go.mod`, `cmd/volta/main.go`, `config/config.go`, `cli/cli.go`, `logo/logo.go`. Dependensi: tidak ada.

### Task 2: Skema SQLite dan interface Storage

Deskripsi: tabel `users`, `sessions`, `devices`, `device_tokens`, `pin_state`, `pin_history`, `dashboards`, `dashboard_widgets`, `mail_queue`, `rules`, `device_status`, `shares`. Migrasi via `//go:embed` + `CREATE TABLE IF NOT EXISTS`. Interface `Storage`. WAL, busy timeout, satu writer pool.

Kriteria:
- [x] migrasi membuat semua tabel
- [x] CRUD tiap tabel ada unit test
- [x] interface menyembunyikan driver

Verifikasi: `go test ./storage/` lulus.

Berkas: `storage/storage.go`, `storage/sqlite.go`, `storage/migrations/`. Dependensi: Task 1.

### Task 3: Token manager

Deskripsi: generator token 32 karakter (`crypto/rand`), pemetaan token ke device, fungsi issue, revoke, lookup; revoke menolak koneksi berikutnya segera via cek DB.

Kriteria: unit test token unik, revoke mengakhiri akses.

Berkas: `auth/auth.go`, `auth/token.go`, `auth/devices.go`. Dependensi: Task 2.

### Task 4: Mailer net/smtp wajib jalan

Deskripsi: paket `mailer` dengan struct `Mailer`, config `mailer.toml` (`[smtp]` + `[queue]`) atau env var, transport STARTTLS atau SMTPS, antrean `mail_queue` di DB, worker dengan batas antrean dan backoff, template register, reset password, event pin, dan hook ke auth maupun rules.

Kriteria:
- [x] antrean + retry backoff teruji (`BackoffSecs` cap 1 jam)
- [x] `TestConnection()` dipanggil `healthz`
- [x] antrean dibatasi `mail_queue.max` (peringatan luapan)

Verifikasi: `go test ./mailer/`, satu pengiriman nyata untuk SMTP produksi.

Berkas: `mailer/mailer.go`. Dependensi: Task 2.

### Task 5: mochi-mqtt embedded

Deskripsi: embed mochi-mqtt v2 (pin di `go.mod`) dengan listener TCP 1883 lokal, hook `VoltaHook` (auth + ACL + tap), `server.Publish()` untuk injeksi cmd, fallback DB untuk token baru.

Kriteria:
- [x] klien MQTT connect lokal (CONNACK 0x00)
- [x] token salah ditolak (CONNACK non-zero)
- [x] hook menerima publish dan cmd terinjeksi sampai ke subscriber

Verifikasi: tes integrasi end-to-end raw TCP di `broker/bridge_test.go`.

Berkas: `broker/broker.go`, `broker/bridge.go`, `topics/topics.go`. Dependensi: Task 1.

### Task 6: auth token device dan status

Deskripsi: hook auth MQTT: username = device token, verifikasi cache+DB, pesan topik `status` retained offline/online, event connect/disconnect menulis status dan device_id.

Kriteria: token salah ditolak, revoke menutup akses, status online/offline terbaca.

Verifikasi: tes integrasi.

Berkas: `broker/bridge.go` (`VoltaHook`, `Presence`, `ResetStalePresence`). Dependensi: Task 3, Task 5.

### Task 7: sadap state pin ke DB

Deskripsi: hook `OnPublish` untuk `state/{pin}`: parse nilai angka atau string, upsert `pin_state`, insert `pin_history`; retained ditangani broker mochi; restart server mereset presence basi.

Kriteria: publish uji terbaca di `pin_state`, status offline tercatat.

Verifikasi: tes integrasi.

Berkas: `pins/state.go`, `broker/bridge.go`. Dependensi: Task 5, Task 6.

### Task 8: perintah cmd ke device

Deskripsi: `CommandBus` publish `volta/dev/{id}/cmd/{pin}` via `server.Publish`, ukur timeout, catat metric.

Kriteria: device uji menerima cmd, timeout masuk metric.

Verifikasi: tes integrasi + `go test ./pins/`.

Berkas: `pins/pins.go`. Dependensi: Task 7.

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| API hook mochi-mqtt berubah antar versi | broker rusak saat upgrade | pin versi di `go.mod` (`v2.7.9`), uji integrasi MQTT di CI |
| Revoke vs cache token | token cabutan masih di cache ≤30 dtk | cek `revoked` di DB per koneksi/publish menutup celah |
| WAL lock di banyak device | data tertunda lama | satu writer pool, busy_timeout, uji publish konkuren |
| Kontrak app berubah | fitur app berbalik desain | kontrak final di atas; ubah di Fase 3+ bila app baru butuh |
| Perangkat tidak mengirim ping | cmd tak pernah diterima | timeout dan metric; sweeper menandai diam >30 dtk offline |

## Pertanyaan Terbuka

1. MQTT versi final: 3.1.1 saja cukup, atau 5 juga? (mochi mendukung keduanya)
2. TLS device: reverse proxy dengan sertifikat publik, atau listener TLS langsung di broker?
3. Session app: session stateful di DB 30 hari (diputuskan, terimplementasi).
4. Nama biner: `volta` (diputuskan, `cmd/volta`); bench: `cmd/bench`.
