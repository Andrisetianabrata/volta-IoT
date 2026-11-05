# PRD: VOLTA. Mobile (Flutter, Android + iOS)

**Status:** Draft
**Tanggal:** 2026-11-05
**Versi:** 1.0
**Keputusan pemilik yang mengunci dokumen ini:**
webapp (`/widgets`, `/dad`) dibekukan sebagai prototipe desain +
spesifikasi visual, bukan produk. Produk = aplikasi mobile penuh
(Flutter, Android + iOS). Konektivitas via server saja (tanpa BLE).
Celah backend (scheduler timer, endpoint rules, engine webhook,
RTC sync) masuk paket ini. Auth email+password saja. MVP memuat
**ke-25 kind widget** sekaligus.

Sumber kebenaran yang dirujuk (semua diverifikasi dari kode, bukan ingatan):
backend `src/http/mod.rs` (rute + bentuk respons), `migrations/*.sql`
(skema), `src/rule/mod.rs` (engine), `webapp/lib/widget-registry.ts`
(25 kinds + skema config), galeri `/widgets` (spesifikasi visual Pebble).

---

## 1. Executive Summary

**One-liner:** Aplikasi mobile Flutter pengganti Blynk Legacy untuk
memantau pin live, mengirim perintah, dan mengelola dashboard
VOLTA. yang memakai server Rust yang sudah ada sebagai satu-satunya
sumber kebenaran.

**Overview:** Pengguna Blynk Legacy butuh 25 jenis widget dalam
5 kategori (controllers, displays, notifications, interface, others)
di atas kanvas dinamis per board. Server VOLTA. sudah menyimpan
board/widget (`dashboards`, `dashboard_widgets`), mendukung live
WS, perintah pin, history, share tautan, dan OTA, tetapi tiga
lubang harus ditutup agar set widget bisa jalan penuh: (1) endpoint
kelola rules (tabel `rules` ada, API tidak ada), (2) scheduler timer
(`run_timer` stub kosong), (3) engine webhook + sinkron jam
(`GET /time`). Flutter dipilih karena produk full-mobile dengan UI
kustom berat; konsistensi render di HP kentang lebih menentukan
daripada berbagi kode dengan webapp yang sudah dibekukan.

**Quick Facts:**
- **Target Users:** pemilik device ESP32 (hobiis + teknisi lapangan)
- **Problem Solved:** ganti Blynk Legacy yang sunset; pantau + kontrol IoT dari HP
- **Key Metric:** board dibuka dan pin live terlihat ≤ 3 dtk setelah login (aktivasi)
- **Target Launch:** MVP internal (board + 25 widget + perintah + history)

---

## 2. Problem Statement

### The Problem

Blynk Legacy (acuan 25 widget) tidak lagi dikembangkan; pengguna
VOLTA. butuh aplikasi HP yang bisa: melihat pin live per device,
mengirim perintah, melihat history, menyusun board dinamis, dan
menerima peringatan berbasis aturan tanpa membangun ulang
server (server Rust selesai dan stabil).

### Current State

Hari ini yang ada: server Rust + firmware ESP32 + prototipe web
(beku). Alur yang dijanjikan plan webapp (login → pilih device →
pin live → perintah → grafik) teruji di `dashboard.html` dan
tercermin di galeri `/widgets` sebagai spesifikasi visual. Yang
belum ada: aplikasi mobile apa pun; API rules; scheduler timer;
webhook keluar; endpoint jam.

### Impact

- **User Impact:** tanpa mobile app, pantau device butuh laptop/browser.
- **Business Impact:** adopsi firmware ESP32 tertahan; tidak ada kanal notifikasi.

### Why Now?

Kontrak server stabil + registry 25 kinds + skema config sudah
didefinisikan (`widget-registry.ts`); tinggal port ke Dart dan
tutup 4 lubang backend dalam satu paket.

---

## 3. Goals & Objectives

### Business Goals

1. **Paritas Blynk Legacy di HP:** 25 kinds bisa dirender + dikontrol dari board dinamis.
2. **Tanpa mock:** setiap angka di layar berasal dari API/WS/MQTT; satu-satunya nilai contoh yang diizinkan berasal dari seed database (`VOLTA_SEED_DEMO=1`, semua bernama "Contoh", lewat API asli) dan tidak pernah hardcode di kode; produksi tanpa data tampilkan empty state jujur.
3. **Satu kontrak:** mobile tidak menyimpan state device; server sumber kebenaran.

### User Goals

1. Buka app → lihat kondisi device saya sekarang (≤ 3 dtk).
2. Kirim perintah dan lihat hasilnya (teks sukses/gagal, bukan warna saja).
3. Terima peringatan saat aturan terpicu.

### Non-Goals

- Editor drag-and-drop visual di HP (tambah widget via form + penempatan otomatis `freeSpot`; editor visual = Fase 2, prototipe ada di `/dad` beku). Editor sumber HTML (sunting teks `html`/`css`/`js` via form) termasuk MVP, lihat D4.
- BLE langsung (diputuskan: via server saja).
- Email rule dan Twitter/post (DITOLAK pemilik; tidak ada di registry, tidak disebut di UI).
- Biometrik/PIN app-lock (diputuskan: email+password saja).
- Web hosting lanjutan (webapp beku; tidak dikembangkan).

---

## 4. User Personas

### Primer: Teknisi lapangan

- Tech savviness: medium; lokasi: kebun/gudang; Android kentang.
- Behaviors: cek pompa/suhu tiap pagi; tambah device baru via HP; butuh teks besar + tombol besar.
- Needs: status online/offline jujur; perintah yang pasti terkirim; peringatan tangki kosong.
- Pain: Blynk lama mati; takut salah pencet; sinyal hilang-timbul.

### Sekunder: Hobiis

- Tech savviness: high; iOS + Android; rakit sensor sendiri.
- Behaviors: bikin board denah HTML kustom; utak-atik config JSON; share board ke keluarga.
- Needs: 25 kinds lengkap; HTML kustom sandbox; tautan share.
- Pain: dial Blynk terbatas; dokumentasi pin `Vn` membingungkan.

---

## 5. User Stories & Requirements

### Epic A: Auth (P0)

##### Story A1: Daftar

```
As a pengunjung baru, I want to daftar dengan email+password, So that saya punya akun pemilik.
```

**Acceptance Criteria:**
- [ ] Given email baru, when daftar via `POST /auth/register`, then 201 `{user_id}`
- [ ] Given email terdaftar, when daftar lagi, then 409 `EXISTS` dengan pesan jelas

**Priority:** P0 · **Dependencies:** API auth eksisting (tanpa perubahan)

##### Story A2: Masuk dan keluar

```
As a pemilik device, I want to masuk dengan email+password, So that saya membuka board dan device milik saya.
```

**Acceptance Criteria:**
- [ ] Given kredensial benar, when login via `POST /auth/login`, then 200 `{token}` disimpan di `secure storage` (bukan plaintext/shared-prefs biasa)
- [ ] Given kredensial salah, when login, then 401 "kredensial salah"
- [ ] Given token kedaluwarsa/invalid (401 pada request apa pun), when terdeteksi, then kembali ke login dengan pesan jelas
- [ ] Given sesi aktif, when keluar, then token dihapus dan kembali ke login

**Priority:** P0 · **Dependencies:** A1

### Epic B: Devices (P0)

##### Story B1: Daftar + status jujur

```
As a teknisi, I want to melihat daftar device dengan status online/offline jujur, So that saya tidak mengira data basi sebagai data live.
```

**Acceptance Criteria:**
- [ ] Given sesi valid, when buka Devices (`GET /devices` + `GET /devices/:id/status` per device), then tiap baris: nama, pill online/offline, `updated_at` ("x lalu")
- [ ] Given device offline, when tampil, then pill netral + teks, bukan angka pin basi
- [ ] Given nol device, when buka, then empty state + ajakan provisioning

##### Story B2: Provisioning (token sekali tampil)

```
As a pemilik device, I want to tambah device dan melihat token sekali saja, So that firmware bisa di-flash dengan kredensial benar.
```

**Acceptance Criteria:**
- [ ] Given nama valid, when `POST /devices {name}`, then 201 `{device_id, token}`; token tampil sekali + tombol salin
- [ ] Given hapus, when konfirmasi dua tahap, then `DELETE /devices/:id` → `{ok:true}`
- [ ] Given id panjang, when tampil di list, then 8 karakter + ellipsis

##### Story B3: OTA (P0, endpoint eksisting)

```
As a pemilik device, I want to mulai/stop OTA per device, So that firmware update tanpa kabel.
```

**Acceptance Criteria:**
- [ ] Given url+version, when `POST /devices/:id/ota/start`, then `{ok:true, version}`; gagal (offline) → teks error, bukan diam
- [ ] Given job jalan, when `POST /devices/:id/ota/stop`, then `{ok:true}`

### Epic C: Monitor live + perintah + history (P0)

##### Story C1: Pin live via WS

```
As a teknisi, I want to nilai pin update live tanpa reload, So that saya tahu kondisi sekarang.
```

**Acceptance Criteria:**
- [ ] Given device terpilih, when buka WS `GET /devices/:id/stream?token=` (session token; token share untuk board publik), then tiap pesan `{"pin","value"}` update ≤ 1 dtk
- [ ] Given WS putus, when terdeteksi, then indikator "Reconnecting" + backoff otomatis
- [ ] Given pin non-numerik, when tampil, then apa adanya, tidak merusak layout
- [ ] Given offline, when sweeper server menandai (≤ ~30 dtk), then pill berubah

##### Story C2: Kirim perintah

```
As a pemilik device, I want to kirim perintah ke pin dan tahu hasilnya, So that kontrol bisa dipercaya.
```

**Acceptance Criteria:**
- [ ] Given pin+value, when `PUT /devices/:id/pins/:pin {"value"}`, then `{ok:true}` → umpan balik teks; timeout 2 dtk → error `CMD_TIMEOUT` sebagai teks
- [ ] Given token share, when kirim ke device dalam cakupan board, then jalan; di luar cakupan → 404 (cakupan = `device` di config widget, `share_scope`)

##### Story C3: History grafik

```
As a hobiis, I want to grafik 1H/24H per pin numerik, So that saya melihat tren.
```

**Acceptance Criteria:**
- [ ] Given pin+rentang, when `GET /devices/:id/history/:pin?from&to&limit` (limit default 500, maks 5000), then 1 garis copper 2px, tick bulat di atas maks, tooltip nilai+waktu
- [ ] Given pin non-numerik, when dibuka, then diabaikan dengan catatan jumlah sampel
- [ ] Given rentang kosong, when dibuka, then garis nol + satu kalimat (bukan panel kosong)

### Epic D: Dashboards + 25 widget (P0, semua sekaligus)

##### Story D1: Render board dinamis

```
As a pengguna, I want to board tampil murni dari definisi server, So that tambah/ubah widget tanpa update aplikasi.
```

**Acceptance Criteria:**
- [ ] Given board id, when `GET /dashboards/:id/widgets`, then tiap `{id,kind,pin,config}` dirender; `kind` tak dikenal → kartu "kind belum didukung", bukan crash
- [ ] Given config, when parse, then validasi klien = cermin server: JSON valid + ≤ 64 KB (`MAX_WIDGET_CONFIG_LEN`) + cek tipe per skema registry
- [ ] Given pin live, when WS jalan, then semua kind display terikat live; kind kontrol kirim via C2
- [ ] Given 25 kinds registry (`widget-registry.ts` → port Dart), when dibuka, then semua terender: button, styled-button, slider, vslider, step, joystick (2 pin), zergba, timer, rtc, labeled-value, led, gauge, lcd, history-chart, terminal, level, push, tabs, menu, table, map, bridge, webhook, ble (via WebBluetooth? Tidak. Mobile pakai BLE native bila kelak; MVP: tampilkan status butuh Fase 2, lihat D4), html
- [ ] Given nilai contoh di galeri web, when di mobile, then TIDAK ADA nilai statis; segel PREVIEW hanya milik galeri web

> Catatan BLE jujur: diputuskan "via server saja". Widget `ble` di MVP = kartu status yang menjelaskan commissioning lewat server (bukan scan BLE langsung). Scan BLE native = Fase 2 eksplisit bila dibutuhkan.

##### Story D2: Kelola board + tambah widget (tanpa drag-drop)

```
As a hobiis, I want to buat board dan tambah widget lewat form, So that board tumbuh tanpa editor visual.
```

**Acceptance Criteria:**
- [ ] Given nama, when `POST /dashboards {name}` → 201 `{id}`; daftar via `GET /dashboards`; hapus via `DELETE /dashboards/:id` (+ share ikut terhapus di server)
- [ ] Given kind+pin+config valid, when `POST /dashboards/:id/widgets`, then 201 `{id}`; posisi `x,y` dihitung klien dengan algoritma `freeSpot` (port dari `/dad`), anti-tumpuk
- [ ] Given widget ada, when `PUT .../widgets/:wid` / `DELETE ...`, then `{ok:true}` dan tampilan ikut berubah
- [ ] Editor drag-and-drop visual TIDAK masuk MVP (prototipe beku `/dad`; Fase 2)

##### Story D3: Berbagi terbuka (aturan W13, tanpa perubahan server)

```
As a pemilik board, I want to satu tautan share per board yang wajib login, So that keluarga bisa lihat + kontrol tanpa akun pemilik.
```

**Acceptance Criteria:**
- [ ] Given board, when `POST /dashboards/:id/share`, then token (satu board = satu tautan); `GET` cek status; `DELETE` cabut
- [ ] Given buka tautan, when tanpa sesi, then ke login dulu (`?next=` kembali); token share dipakai sebagai Bearer untuk device dalam cakupan; di luar cakupan → 404; token dicabut → "tautan tidak valid"
- [ ] TANPA peran viewer, TANPA branding, TANPA kuota (keputusan open, sama seperti server)

##### Story D4: Widget HTML kustom (sandbox)

```
As a hobiis, I want to widget HTML/JS saya jalan terisolasi, So that denah kustom bisa baca pin dan kirim perintah dengan aman.
```

**Acceptance Criteria:**
- [ ] Given `{html,css?,js?}` ≤ 64 KB per field (cek klien + server menolak `CONFIG_TOO_LARGE`), when disimpan, then tampil dalam WebView sandbox tanpa akses DOM/storage induk
- [ ] Given bridge sempit, when widget kirim `{type:"cmd",pin,value}`, then induk validasi + teruskan via C2; induk kirim `{type:"pin",pin,value}` tiap update
- [ ] Given `parent.document`/cookie/storage, when diakses dari widget, then gagal terisolasi
- [ ] Given kind `html`, when tambah/ubah via form, then field `html`/`css`/`js` bisa disunting sebagai teks (editor sumber termasuk MVP; editor visual bukan MVP)

### Epic E: Rules, timer, webhook, jam (P0 backend satu paket)

> Fakta: tabel `rules` ada; endpoint tidak ada; `run_timer` stub kosong; webhook tidak ada; endpoint jam tidak ada.

##### Story E1: Endpoint rules (BARU)

```
As a teknisi, I want to aturan "jika pin < ambang maka aksi" yang tersimpan di server, So that peringatan jalan walau HP mati.
```

**Acceptance Criteria:**
- [ ] Given `POST /devices/:id/rules {pin, op, threshold, action, action_pin?, action_value?, enabled?}`, then 201 `{id}`; op ∈ `gt|gte|lt|lte|eq|changed`; action ∈ `set_pin|notify|mail|webhook|forward` (ekstensi terkontrol dari `set_pin|notify|mail` yang dikenal engine)
- [ ] Given daftar, when `GET /devices/:id/rules`, then semua rule device milik user; `PUT .../rules/:rid` ubah; `DELETE` hapus
- [ ] Given engine `rule::run`, when event cocok + enabled, then: `set_pin` → perintah ke pin aksi (satu device, seperti sekarang); `notify|mail` → antre SMTP (seperti sekarang); `webhook` → POST keluar (E3); `forward` → perintah ke `<target_device>:<target_pin>` (E4, kepemilikan dicek)
- [ ] Widget `push` = editor rule `{op,threshold,message}` (skema registry); delivery MVP = antre mail + banner in-app dari stream; push FCM = Fase 2 eksplisit

##### Story E2: Scheduler timer (BARU, ganti stub)

```
As a pemilik lampu/pompa, I want to jadwal nyala/mati berulang, So that otomatisasi jalan tanpa HP.
```

**Acceptance Criteria:**
- [ ] Given `POST /devices/:id/timers {pin, value, time:"HH:MM", days:"S,S,R,K,J,S,M", enabled}`, then 201 `{id}`; CRUD penuh `GET/PUT/DELETE /devices/:id/timers[/:tid]`
- [ ] Given `run_timer` diimplementasi (tick 60 dtk, ganti stub kosong), when waktu+hari cocok + enabled, then perintah dikirim via CommandBus yang sama (timeout 2 dtk, gagal tercatat, bukan diam)
- [ ] Widget `timer` = editor timer ini (skema registry `{action,days}` + waktu)

##### Story E3: Webhook keluar (BARU)

```
As a hobiis, I want to data pin diteruskan ke URL saya saat rule picu, So that integrasi pihak ketiga jalan.
```

**Acceptance Criteria:**
- [ ] Given rule action `webhook` (action_pin=url, action_value=method), when picu, then engine POST `{device,pin,value,ts}`; gagal jaringan → retry terbatas + tercatat (tidak crash engine)
- [ ] Given URL, when `POST /devices/:id/webhooks/test {url}`, then hasil (`200 · xx ms` / error teks), cermin tombol "Send test ping" galeri
- [ ] Widget `webhook` = editor endpoint + tombol tes

##### Story E4: Bridge antar-device (BARU, via rules)

```
As a pemilik dua device, I want to satu pin meneruskan ke device lain, So that sensor → pompa lintas device.
```

**Acceptance Criteria:**
- [ ] Given rule action `forward` dengan target milik user yang sama, when picu, then perintah ke target; target milik orang lain → 404 (bocor kepemilikan = bug P0)
- [ ] Widget `bridge` = editor from→to (skema registry `{target,targetPin}`)

##### Story E5: Sinkron jam (BARU, kecil)

```
As a firmware, I want to satu sumber jam server, So that RTC tidak ngawur.
```

**Acceptance Criteria:**
- [ ] Given sesi valid, when `GET /time`, then `{now: unix}`; firmware sync saat connect (perubahan kecil `VoltaDevice`, sejawat `publishState`)
- [ ] Widget `rtc` tampilkan jam device; fallback jam HP bila sync gagal, dengan label jujur

**Priority:** P0 (kecil) · **Dependencies:** endpoint baru + patch firmware

---

## 6. Success Metrics

### North Star

**Metric:** board dengan pin live terlihat per minggu (board aktif mingguan).
**Definisi:** board unik yang memuat ≥ 1 nilai WS dalam 7 hari.
**Target:** 80% board terdaftar aktif dalam 30 hari pasca-launch internal.
**Kenapa:** mencerminkan nilai inti: "device saya melaporkan apa sekarang".

### Pendukung (HEART-lite)

| Metric | Kini | Target | Kapan |
|---|---|---|---|
| Aktivasi: daftar → pin live pertama ≤ 10 mnt | - | 70% | MVP+30 hari |
| Task success: perintah terkirim `{ok:true}` / attempt | - | ≥ 95% | MVP+30 hari |
| Retention: board aktif W1 berulang | - | ≥ 40% | MVP+60 hari |
| Happiness: rating Play/App Store | - | ≥ 4.5 | MVP+90 hari |
| Kinerja: p95 buka board (cache) | - | < 2 dtk | MVP |

### Counter-metric

- Crash-free sessions ≥ 99.5%; perhatian: jangan kejar aktivasi dengan mengorbankan keandalan perintah.

### Rencana ukur

- Event: `login_ok`, `board_open`, `cmd_sent`, `cmd_ok`, `rule_created`, `share_opened`.
- Review: mingguan; pemilik: tim mobile.

---

## 7. Scope

### In Scope (MVP)

- Auth email+password (A1), Devices+status+provisioning+OTA (B1–B3).
- Live WS + reconnect, perintah pin, history 1H/24H (C1–C3).
- Board dinamis + **25 kinds** + tambah via form/`freeSpot` + share terbuka (D1–D3).
- HTML sandbox + bridge (D4).
- Backend paket: rules CRUD, scheduler timer, webhook engine+tes, bridge forward, `GET /time` (E1–E5).

### Fase 2 (post-MVP)

- Editor visual drag-and-drop di HP; push FCM (`push_tokens` + sender); scan BLE native; biometrik app-lock; grafik 7D.

### Out of Scope (eksplisit)

- Email rule dan Twitter/post: DITOLAK: tidak ada di registry, tidak disebut di UI.
- BLE langsung di MVP; webapp dilanjutkan (beku sebagai prototipe).

---

## 8. Technical Considerations

### Arsitektur

```
Flutter (Android+iOS) ──REST/WS──▶ Axum (ada) ──▶ SQLite (ada)
     │                                ├─ rules API (BARU) ─▶ rule::run (+webhook/forward)
     │                                ├─ timers API (BARU) ─▶ run_timer (implementasi)
     │                                ├─ GET /time (BARU)
     │                                └─ mailer (ada, SMTP antrean)
Firmware ESP32 ──MQTT──▶ rumqttd (ada) ──▶ PinBus ─▶ WS fan-out (ada)
```

### Stack

- **Mobile:** Flutter 3.x (stable), Dart; Riverpod; `mqtt_client`, `web_socket_channel`, `fl_chart`/`custompainter` (dial), `flutter_map` (OSM ganti Leaflet), `flutter_inappwebview` (sandbox setara `sandbox="allow-scripts"` tanpa origin bersama), `flutter_secure_storage`.
- **Backend:** Rust (ada); migrasi `0003_rules_api.sql` (timers), `0004_webhook.sql` bila perlu kolom antrean; tidak ada ORM baru (trait `Storage` + `sqlx`, pola ada).
- **Infrastruktur:** server tunggal yang sama; broker 1883/8883 (lihat `/healthz`).

### Tabel API (jalan + baru)

| Method & Path | Status | Body → Respons |
|---|---|---|
| `POST /auth/register` | ada | `{email,password}` → 201 `{user_id}`; 409 `EXISTS` |
| `POST /auth/login` | ada | `{email,password}` → 200 `{token}`; 401 kredensial salah |
| `GET /devices`, `POST /devices`, `DELETE /devices/:id` | ada | `{name}` → 201 `{device_id, token}` (sekali) |
| `GET /devices/:id/status` | ada | → `{online, updated_at}` |
| `GET /devices/:id/pins`, `GET .../pins/:pin` | ada | → status pin `{device_id,pin,value,updated_at}` |
| `PUT /devices/:id/pins/:pin` | ada | `{value}` → `{ok:true}` / `CMD_TIMEOUT` (2 dtk) |
| `GET /devices/:id/history/:pin?from&to&limit` | ada | limit default 500/maks 5000 → baris data |
| `GET /devices/:id/stream?token=` | ada | WS pesan `{"pin","value"}` per device |
| `POST /devices/:id/ota/start`, `/stop` | ada | `{url,version}` → `{ok:true, version}` |
| `GET/POST /dashboards`, `PUT/DELETE /:id` | ada | `{name}` → 201 `{id}` |
| `GET/POST /:id/widgets`, `PUT/DELETE /:id/widgets/:wid` | ada | `{kind,pin,config}` → 201 `{id}`; config JSON ≤ 64 KB |
| `POST/GET/DELETE /dashboards/:id/share`, `GET /share/:token` | ada | token; cakupan via `config.device` |
| `GET /healthz`, `GET /admin/stats` | ada | broker/db/mailer/stats |
| `POST /devices/:id/rules` + `GET/PUT/DELETE` | BARU (E1) | `{pin,op,threshold,action,action_pin?,action_value?,enabled?}` → 201 `{id}` |
| `POST /devices/:id/timers` + `GET/PUT/DELETE` | BARU (E2) | `{pin,value,time,days,enabled}` → 201 `{id}` |
| `POST /devices/:id/webhooks/test` | BARU (E3) | `{url}` → hasil teks |
| `GET /time` | BARU (E5) | → `{now}` |

### Keamanan

- Sesi Bearer di semua rute user; share-token hanya untuk device dalam cakupan (pola `share_scope` + `check_device` dipakai ulang untuk rute BARU).
- Token sesi di `secure storage`; tidak di log; WS pakai `?token=` hanya untuk upgrade (risiko rendah yang didokumentasikan plan).
- Webhook SSRF: batasi skema http/https, timeout 5 dtk, tanpa meneruskan kredensial server.
- Batas laju login 10/mnt/IP (aturan baru, cegah serangan brute force).

### Kinerja

- p95 `GET` pin/history < 300 ms lokal; `backoff` sambung-ulang WS 1/2/4/8 dtk + `jitter`; cache board+widget 5 mnt dengan invalidasi saat CRUD.

---

## 9. Design & UX Requirements

### Bahasa visual Pebble (diwarisi galeri beku)

| Token | Gelap | Terang |
|---|---|---|
| ground / surface / raised | `#0A0A0B` / `#131316` / `#1B1B1F` | `#F3F0E8` / `#FFFFFF` / `#E9E4D6` |
| teks / muted | `#F2EFE9` / `#A7A7B0` | `#131315` / `#5B5B62` |
| aksen copper (energi/live) | `#C07A24` | `#C07A24` |
| positif / negatif | `#3FC07A` / `#E5566F` | `#247B50` / `#C4242A` |

Radius kartu 28; angka tabular; label mikro 11px kapital; Copper hanya untuk energi/live; tombol primer tinta.

### Alur utama

1. Login → 2. Devices (pilih; tambah bila kosong) → 3. Monitor (pin live + grafik + perintah + strip kesehatan, pola W3–W6) → 4. Boards (daftar → board → tambah widget via form) → 5. Share (buat/salin/cabut) → 6. Settings (tema, akun, info server, sambung-ulang WS).

### Aksesibilitas

- Semua kontrol berlabel; kontras teks ≥ 4.5:1; target sentuh ≥ 44px; TalkBack/VoiceOver untuk nilai pin dan status; bukan warna saja (teks sukses/gagal selalu ada).

---

## 10. Timeline & Milestones

Target: minggu relatif sejak kickoff (tanggal pasti di sign-off).

| Fase | Hasil | Estimasi |
|---|---|---|
| M1 fondasi | Proyek Flutter, auth, `secure storage`, daftar device+status, tema Pebble | M1–M2 |
| M2 inti | WS live + sambung ulang, perintah, history 1H/24H, 3 renderer fondasi (gauge, button, slider) | M2–M4 |
| M3 penuh | 22 kind sisa + sandbox HTML + tambah via form + share + OTA | M4–M7 |
| M4 backend | CRUD rules, scheduler, engine webhook+tes, forward, `GET /time`, patch firmware RTC | M5–M7 (paralel, engineer Rust) |
| M5 beta | Uji pakai internal 2 board + 6 widget ("Contoh", pola `seed.rs`), kanal Play Internal + TestFlight | M8 |
| M6 launch | Rilis GA Play Store + App Store, pemantauan metrik §6 | M9 |

---

## 11. Risks & Mitigation

| Risiko | Dampak | Probabilitas | Mitigasi |
|---|---|---|---|
| 25 kind sekaligus terlalu besar untuk MVP | High | Med | Fondasi dulu (gauge/button/slider + M4 paralel), sisanya di balik `feature flag` per kind |
| HP kentang tersendat (dial, peta, drag) | High | Med | `CustomPainter` + `RepaintBoundary`; ubin peta OSM di-cache; uji di device RAM 2 GB |
| Bug engine webhook/forward → perintah liar | High | Low | Kepemilikan dicek dua sisi; uji coba `test`; log audit rule-fire 30 hari |
| FCM absen → peringatan telat saat aplikasi mati | Med | High | Jujur di alur pengenalan: aturan server berjalan melalui mail; FCM Fase 2 eksplisit |
| Kontrak API berubah diam-diam | Med | Low | Tabel §8 dikunci; uji kontrak tiap rilis server; versi di `GET /` |
| Token di URL WS tercatat di log | Low | Med | Hanya untuk upgrade; pertimbangkan umur pendek (risiko bawaan plan) |

---

## 12. Dependencies & Assumptions

### Dependencies

- [ ] Server Rust + broker MQTT berjalan (port sesuai `/healthz`)
- [ ] SMTP terkonfigurasi bila rule `mail` dipakai (mailer opsional, antrean tetap jalan)
- [ ] Akun Play Console + App Store Connect + penandatanganan rilis
- [ ] Kebijakan penggunaan ubin OSM dipatuhi untuk `flutter_map`

### Assumptions

- Pin = string bebas (kontrak firmware↔server opak; `V` hanya konvensi contoh)
- Satu board = satu tautan share; share wajib login (aturan W13, tanpa perubahan)
- Webapp tetap beku; perubahan visual mobile merujuk galeri, bukan sebaliknya

---

## 13. Open Questions

- [ ] Retensi history default 1H/24H cukup atau perlu 7D sebelum GA? (Keputusan sebelum M3; default cukup, warisan plan.)
- [ ] Nama paket Android + ID bundel iOS final apa? (Perlu sebelum penandatanganan M5.)
- [ ] Batas jumlah rule/timer per device? (Usulan: 20/20, kunci sebelum M4.)
- [ ] FCM Fase 2 atau tetap mail+dalam aplikasi? (Ditentukan dari data aktivasi M6.)

---

## 14. Sign-Off

| Pemangku kepentingan | Peran | Status |
|---|---|---|
| Pemilik produk | Keputusan scope (25 kinds, tanpa email/Twitter, via server) | Disetujui di chat 2026-11-05 |
| Tech lead Rust | Endpoint BARU + engine + migrasi | Menunggu |
| Tech lead Flutter | Renderer + sandbox + rilis ke toko aplikasi | Menunggu |
| QA | Kriteria tiap cerita + uji lawan device asli | Menunggu |

---

## Appendix

- **Referensi:** `tasks/plan-webapp.md` (W1–W14), `tasks/todo-webapp.md`, `webapp/lib/widget-registry.ts`, galeri beku `/widgets`, kanvas beku `/dad`, `src/seed.rs` (data "Contoh").
- **Glosarium:** kind = tipe widget; pin = string bebas; config = JSON ≤ 64 KB; board = dashboard; cakupan share = device dari `config.device`.
- **Change Log:** 1.0 (2026-11-05): draf awal hasil penggalian kebutuhan (Android+iOS, via server, backend satu paket, auth dasar, 25 kinds); 1.1: editor sumber HTML ditegaskan, A1 dipecah dua, bahasa Indonesia dirapikan di §8–§14.