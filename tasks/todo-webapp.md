# Daftar Task: VOLTA. Web Client (Next.js)

Rincian ada di `tasks/plan-webapp.md`. File ini HANYA untuk webapp.
Task server Rust tetap di `tasks/todo.md` (selesai, jangan campur).

Keputusan pemilik 2026-11-04: landing utama = `/` (varian one-motif
noir + kobalt, Jost, WebGL 3D, Recharts, open-source dengan CTA
Install/Download ke GitHub). Halaman tembaga lama diarsipkan di
`/landing` sebagai referensi, tidak dikembangkan lagi.

## Fase 0 — Fondasi

- [x] Task W1: Scaffold webapp + sistem desain dua tema (M) — selesai
- [x] Task W2: BFF proxy + auth (M) — selesai

## Checkpoint A

- [ ] Build + typecheck + lint hijau
- [ ] Login/logout end-to-end lawan server asli
- [ ] Review screenshot 1440 + 390

## Fase 1 — Inti monitoring

- [x] Task W3: Shell + strip kesehatan (S) — kode selesai, tsc hijau; restyle Open plane (sidebar 240px, KPI tanpa kotak); verifikasi visual + lawan server asli di Checkpoint A
- [x] Task W4: Daftar + pilih device (S) — kode selesai: satu layar kelola (daftar + status jujur + tambah + token sekali tampil + hapus 2 tahap, W7 gabung); verifikasi live di Checkpoint B
- [ ] Task W5: Pin live + kirim perintah (M)
- [ ] Task W6: Grafik history (M)

## Checkpoint B

- [ ] Alur penuh lawan server + device asli
- [ ] Build + typecheck hijau, screenshot 1440/768/390 diperiksa

## Fase 2 — Lengkap

- [x] Task W7: Provisioning (S) — gabung ke W4, tanpa tab/rute sendiri (`/provision` redirect ke `/devices`); token sekali tampil + salin + hapus 2 tahap jadi
- [ ] Task W8: Halaman detail device (S)
- [ ] Task W9: Kontrol OTA (XS)
- [x] Task W10: Dashboard dinamis ala no-code engine (M) — kode selesai: daftar/buat/hapus board, kanvas multi-device (1 WS per device), 7 renderer + kartu jujur, tambah widget via UI (pilih kind + device + pin); verifikasi live lawan server asli di Checkpoint B
- [ ] Task W11: Widget HTML kustom sandbox (S)
- [ ] Task W12: Editor visual drag-and-drop + grid responsif (M)
- [ ] Task W13: Wajah SaaS — branding, berbagi, peran (M)
- [ ] Task W14: Pengaturan — tema, akun, server (S)

## Checkpoint C

- [ ] Semua acceptance W1–W14 terpenuhi
- [ ] Gate visual lolos (lint + inspect + kritik tercatat)
- [ ] Kontras ≥ 4.5:1, keyboard penuh, semua state ada
- [ ] Tanpa data invented; README diperbarui
