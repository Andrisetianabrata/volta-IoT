# Todo: VOLTA. Mobile Flutter (MVP → Beta → GA)

Sumber: `tasks/prd-mobile-flutter.md` v1.5. File lama di `tasks/Archive/` (beku, jangan dipakai).
Tooling: `go build ./...`, `go vet ./...`, `go test ./...` dari root; `flutter test`, `flutter analyze` dari `mobile/`.

## Tier launch (technical-launch-planner)

- Skor: produk baru 10 + semua user 10 + revenue 0 + diferensiasi signifikan 6 + platform baru 7 + docs baru 6 + minat komunitas 3 = **42/58 → Tier 1 Major** untuk GA Play Store + App Store.
- M5 beta internal diperlakukan sebagai **Tier 3** (2 board + 6 widget "Contoh", kanal Play Internal + TestFlight).
- Metrik wajib instrumentasi (PRD §6): `login_ok, board_open, cmd_sent, cmd_ok, rule_created, share_opened`.

## Fase 0: Fondasi — sudah jalan, verifikasi saja

- [x] A0 server dinamis + `GET /healthz` indikator (`login_screen.dart`, `server_config.dart`)
- [x] A1/A2 register/login, token di `secure storage`, sesi 401 → login
- [x] B1/B2 devices list + status jujur + provisioning token sekali + hapus
- [x] Boards list/buat/hapus; board render `gauge,button,slider` + WS live + reconnect + validasi 64KB
- [x] C2 `PUT pins` timeout 2 dtk; B3 OTA start/stop (API + UI `device_screen.dart`)
- [ ] Verifikasi: `go test ./...` lulus; `flutter test` lulus; buka board + pin live ≤3 dtk di HP RAM 2GB
- [ ] Celah kecil: ganti server wajib `SessionStore.clear()` + kembali ke login (A0)

## Fase 1: Tutup loop inti (PA — kerjakan dulu)

Tanpa ini board tidak bisa tumbuh/diuji. Unblock M5 beta.

- [ ] C3 history: `GET /devices/:id/history/:pin?from&to&limit` di `VoltaApi` + UI grafik 1H/24H (1 garis copper 2px, tick bulat, tooltip nilai+waktu, sampel non-numerik diabaikan + hitung, rentang kosong = garis nol + 1 kalimat)
- [ ] D2 tambah widget via form: `POST /dashboards/:id/widgets {kind,pin,config}` + `PUT/DELETE .../:wid` di `VoltaApi`; `x,y` dihitung klien `freeSpot` (port `/dad`); validasi JSON + ≤64KB cermin server; hapus `Board kosong. Tambah widget segera hadir.`
- [ ] Checkpoint: dari nol (daftar → buat device → buat board → tambah 3 widget → live → perintah → history) ≤10 mnt

## Fase 2: Backend paket E (paralel, engineer Rust/Go)

Tabel `rules` ada, endpoint belum ada; `RunTimer` stub no-op (`rule/rule.go:64`).

- [ ] E1 rules CRUD: `POST/GET/PUT/DELETE /devices/:id/rules[/:rid] {pin,op,threshold,action,action_pin?,action_value?,enabled?}`; op `gt|gte|lt|lte|eq|changed`; reuse `share_scope` + `check_device`; batas 20/device
- [ ] E1 engine: `webhook` + `forward` selain `set_pin|notify|mail` yang ada; kepemilikan target dicek dua sisi; gagal jaringan = tercatat, bukan crash; audit log fire 30 hari
- [ ] E2 timers: migrasi `timers` + CRUD `POST/GET/PUT/DELETE /devices/:id/timers[/:tid] {pin,value,time:HH:MM,days:S,S,R,K,J,S,M,enabled}`; implementasi `RunTimer` tick 60 dtk via `CommandBus` yang sama (timeout 2 dtk); batas 20/device
- [ ] E5 `GET /time → {now}` + patch `VoltaDevice` sync saat connect; widget `rtc` fallback jam HP + label jujur
- [ ] E3 webhook: engine POST `{device,pin,value,ts}`, timeout 5 dtk, hanya http/https, tanpa kredensial, retry terbatas; `POST /devices/:id/webhooks/test {url}` → `200 · xx ms` / error teks
- [ ] E4 bridge: rule `forward` ke `<target_device>:<target_pin>` milik user yang sama; milik orang lain → 404 (bug P0)
- [ ] Verifikasi: `go test ./...` + uji lawan device asli (rule picu → pin aksi; timer picu ±60 dtk; webhook test; forward lintas device)

## Fase 3: 22 kind sisa (sesudah loop inti jalan, di balik feature flag per kind)

Hanya `button,slider,gauge` yang render (`board_screen.dart:231`). Registry acuan: `webapp/lib/widget-registry.ts`.

- [ ] Batch 1 murah (controllers/displays): `styled-button,step,led,labeled-value,lcd,level,terminal,vslider`
- [ ] Batch 2 interaksi: `joystick` (2 pin), `zergba`, `tabs,menu,push` (editor `{op,threshold,message}`; delivery = antre mail + banner in-app, FCM = Fase 2), `timer` (editor E2), `rtc`, `history-chart` (pakai C3)
- [ ] Batch 3 berat: `table,map` (`flutter_map`, ubin OSM di-cache, patuhi kebijakan OSM), `bridge` (editor from→to), `webhook` (editor + tombol tes), `ble` (kartu status commissioning via server, bukan scan; scan native = Fase 2), `html`
- [ ] Aturan: `kind` tak dikenal → kartu `kind belum didukung`, bukan crash; tanpa nilai statis; tanpa `parent.document`/cookie/storage lolos sandbox

## Fase 4: Share + sandbox + polish

- [ ] D3 share: `POST/GET/DELETE /dashboards/:id/share` di `VoltaApi` + UI buat/salin/cabut; buka tautan tanpa sesi → login dulu (`?next=`); di luar cakupan → 404; dicabut → `tautan tidak valid`
- [ ] D4 html sandbox: `flutter_inappwebview` setara `sandbox="allow-scripts"` tanpa origin bersama; bridge sempit `{type:cmd,pin,value}` / `{type:pin,pin,value}`; editor sumber `html/css/js` via form (≤64KB/field)
- [ ] Keamanan §8: tolak skema non-http/https; rate-limit login 10/mnt/IP; versi di `GET /`; tidak log token/share-token
- [ ] Kinerja §8: cache board+widget 5 mnt + invalidasi CRUD; p95 buka (cache) <2 dtk; `CustomPainter` + `RepaintBoundary` untuk dial

## Fase 5: Beta Tier 3 → GA Tier 1

- [ ] M5 beta: seed `VOLTA_SEED_DEMO=1` (semua "Contoh", via API asli); Play Internal + TestFlight; 2 board + 6 widget
- [ ] Docs wajib (launch-planner): getting started, API reference tabel §8, 3+ code sample, integrasi, troubleshooting; changelog per rilis; kontrak API dikunci
- [ ] M6 GA: nama paket Android + bundle iOS dikunci (sebelum M5); sign-off pemilik/tech-lead-Rust/tech-lead-Flutter/QA; review mingguan metrik §6 (aktivasi 70%, cmd_ok ≥95%, crash-free ≥99.5%)
- [ ] Fase 2 eksplisit (jangan masuk MVP): drag-drop visual, FCM `push_tokens`, scan BLE native, biometrik, grafik 7D

## Jangan dulu (Out of Scope PRD)

- Email rule, Twitter/post; BLE langsung; webapp dilanjutkan (beku sebagai prototipe); FCM sebelum mail+in-app terbukti kurang.
