# Daftar Task: Blynk RS (MQTT-Only, Rust)

Rincian kriteria dan verifikasi ada di `tasks/plan.md`, checklist ini hanya status pengerjaan.

## Fase 1: Fondasi dan mailer wajib

- [x] Task 1: Scaffolding crate, config, CLI, tracing (S)
- [x] Task 2: Skema SQLite dan trait Storage (M)
- [x] Task 3: Token manager (S)
- [x] Task 4: Mailer lettre wajib jalan (M)

## Checkpoint 1

- [x] `cargo build`, `cargo test`, clippy lulus
- [x] Migrasi DB membuat semua tabel
- [x] Email terkirim lewat SMTP STARTTLS
- [x] `healthz` melaporkan status mailer

## Fase 2: MQTT hardware

- [x] Task 5: rumqttd embedded, 1883 lokal dan 8883 TLS (M)
- [x] Task 6: auth token device dan LWT status (S)
- [x] Task 7: sadap state pin ke DB dan retained (M)
- [x] Task 8: perintah cmd ke device dengan timeout (S)

## Checkpoint 2

- [x] Device uji login, publish state, terima cmd
- [x] Status online/offline terbaca di healthz
- [x] Retained state dimuat setelah restart

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
- [x] Task 15: Paket release, dokumentasi, uji ACME

## Checkpoint 4

- [x] Semua kriteria di plan.md terpenuhi
