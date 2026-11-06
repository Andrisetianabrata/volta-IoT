# Daftar Task: VOLTA. (MQTT-Only, Go)

Migrasi Rust → Go selesai 1:1. Rincian kriteria dan verifikasi ada di `tasks/plan.md`, checklist ini hanya status pengerjaan.

Tooling: `go build ./...`, `go vet ./...`, `go test ./...` dari root repo.

## Fase 1: Fondasi dan mailer wajib

- [x] Task 1: Scaffolding modul, config, CLI, logging (S)
- [x] Task 2: Skema SQLite dan interface Storage (M)
- [x] Task 3: Token manager (S)
- [x] Task 4: Mailer net/smtp wajib jalan (M)

## Checkpoint 1

- [x] `go build`, `go test`, vet lulus
- [x] Migrasi DB membuat semua tabel
- [x] Antrean mail + backoff jalan
- [x] `healthz` melaporkan status mailer

## Fase 2: MQTT hardware

- [x] Task 5: mochi-mqtt embedded, 1883 lokal (8883 TLS via reverse proxy) (M)
- [x] Task 6: auth token device dan status online/offline (S)
- [x] Task 7: sadap state pin ke DB dan retained (M)
- [x] Task 8: perintah cmd ke device dengan timeout (S)

## Checkpoint 2

- [x] Device uji login, publish state, terima cmd
- [x] Status online/offline terbaca di DB dan healthz
- [x] Presence basi direset setelah restart

## Fase 3: App API

- [x] Task 9: REST auth register, login, session
- [x] Task 10: CRUD dashboard, device, widget
- [x] Task 11: WS stream pin dan history

## Checkpoint 3

- [x] Register, login, dan pin live via WS jalan

## Fase 4: Rule dan operasi

- [x] Task 12: Rule engine eventor dan timer
- [x] Task 13: Statistik admin dan health
- [x] Task 14: OTA via topic cmd
- [x] Task 15: Paket release, dokumentasi install, smoke test biner

## Checkpoint 4

- [x] Semua kriteria di plan.md terpenuhi

## Fase 5: Berbagi terbuka (keputusan pemilik: open untuk semua)

- [x] S5: Berbagi board terbuka — satu tautan per board, wajib login, lihat + kontrol (S)
- [ ] S6: Kuota paket — DIBATALKAN (open, tanpa batas)
- [ ] S7: Branding per pelanggan — DIBATALKAN (satu brand VOLTA.)

## Checkpoint 5

- [x] Berbagi terbuka jalan end-to-end (buat → buka wajib login → kontrol → cabut)
- [ ] S6/S7 tidak dibangun sesuai keputusan open

## Migrasi Rust → Go (selesai)

- [x] 31 route HTTP dipindahkan 1:1 (`http`)
- [x] 18 paket + 2 biner (`volta`, `bench`)
- [x] 40+ tes Go lulus (`go test ./...`)
- [x] Smoke test biner end-to-end (MQTT + HTTP)
- [x] Kode Rust dihapus (`src/`, `Cargo.*`, `migrations/` root, `target/`)
