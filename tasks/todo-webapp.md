# Daftar Task: VOLTA. Web Client (Next.js)

Rincian ada di `tasks/plan-webapp.md`. File ini HANYA untuk webapp.
Task server Rust tetap di `tasks/todo.md` (selesai, jangan campur).

Keputusan pemilik 2026-11-04: landing utama = `/` (varian one-motif
noir + kobalt, Jost, WebGL 3D, Recharts, open-source dengan CTA
Install/Download ke GitHub). Halaman tembaga lama diarsipkan di
`/landing` sebagai referensi, tidak dikembangkan lagi.

## Fase 0 — Fondasi

- [ ] Task W1: Scaffold webapp + sistem desain dua tema (M)
- [ ] Task W2: BFF proxy + auth (M)

## Checkpoint A

- [ ] Build + typecheck + lint hijau
- [ ] Login/logout end-to-end lawan server asli
- [ ] Review screenshot 1440 + 390

## Fase 1 — Inti monitoring

- [ ] Task W3: Shell + strip kesehatan (S)
- [ ] Task W4: Daftar + pilih device (S)
- [ ] Task W5: Pin live + kirim perintah (M)
- [ ] Task W6: Grafik history (M)

## Checkpoint B

- [ ] Alur penuh lawan server + device asli
- [ ] Build + typecheck hijau, screenshot 1440/768/390 diperiksa

## Fase 2 — Lengkap

- [ ] Task W7: Provisioning (S)
- [ ] Task W8: Halaman detail device (S)
- [ ] Task W9: Kontrol OTA (XS)
- [ ] Task W10: Dashboard dinamis ala no-code engine (M)
- [ ] Task W11: Widget HTML kustom sandbox (S)
- [ ] Task W12: Editor visual drag-and-drop + grid responsif (M)
- [ ] Task W13: Wajah SaaS — branding, berbagi, peran (M)
- [ ] Task W14: Pengaturan — tema, akun, server (S)

## Checkpoint C

- [ ] Semua acceptance W1–W14 terpenuhi
- [ ] Gate visual lolos (lint + inspect + kritik tercatat)
- [ ] Kontras ≥ 4.5:1, keyboard penuh, semua state ada
- [ ] Tanpa data invented; README diperbarui
