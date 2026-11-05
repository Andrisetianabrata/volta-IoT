# Implementation Plan: VOLTA. Web Client (Next.js + TSX)

## Overview

Klien web untuk server VOLTA.: pantau pin live per device via WebSocket,
lihat history dalam grafik, kirim perintah ke pin, provision device baru,
dan cek kesehatan server. Satu codebase Next.js (App Router + TypeScript)
di folder `webapp/`, independen dari crate Rust dan firmware. Server tetap
satu-satunya sumber kebenaran; webapp tidak menyimpan state device sendiri.

Status task lama tidak disentuh: `tasks/plan.md` + `tasks/todo.md` tetap
milik server Rust (selesai 100%). Task webapp hidup di file ini dan
`tasks/todo-webapp.md`.

## Architecture Decisions

- **Next.js App Router + TypeScript**, folder `webapp/` di root repo.
  Alasan: satu deploy untuk UI + BFF proxy; tim sudah di Node 22.
- **BFF proxy, bukan CORS.** Semua REST lewat Next.js route handlers
  (`/api/[...path]` → `VOLTA_API_URL`). Alasan: server Rust tidak
  mengirim header CORS; proxy menghindari preflight dan menyembunyikan
  origin server. WebSocket tetap langsung ke server dengan `?token=`
  (server sudah mendukung token via query, teruji di `dashboard.html`).
- **Auth: httpOnly cookie + endpoint ws-token.** Login via BFF menyimpan
  token di cookie httpOnly; klien mengambil token WS sekali pakai lewat
  `GET /api/ws-token` hanya saat membuka stream. Alasan: token tidak
  diam di `localStorage`, sesi selamat refresh, SSR tetap bisa.
- **shadcn/ui sebagai primitif, bukan tampilan.** Pakai komponen
  (button, input, select, table, tabs, switch) tapi seluruh token
  diganti ke sistem desain dealt (di bawah). Alasan: aksesibilitas +
  perilaku bawaan shadcn, tanpa rupa default shadcn.
  Aturan pemilik (mengikat): primitif di `components/ui/` wajib dipasang
  via `npx shadcn@latest add`, dilarang tulis tangan; hasil install
  wajib diretokens ke `DESIGN.md` (palet, radius, Jost), dilarang mentah
  atau default shadcn. Komponen domain/proyek (`widgets/`, fragmen
  landing) tetap ditulis tangan mengikuti DESIGN.md.
- **Grafik SVG buatan sendiri** (port logika `dashboard.html` yang sudah
  lolos uji visual: 1 garis, 4 gridline, tick bulat, tanpa legenda).
  Alasan: aturan app-screen melarang default library grafik.
- **Art direction: `one-motif` noir + kobalt** (deal `draw.mjs`,
  seed 1775104155; Jost; satu motif kotak Bit di semua skala: pita,
  thumb slider, plus/minus, medan kubus 3D). Keputusan pemilik
  2026-11-04: varian `/landing` dipromosikan menjadi halaman utama `/`;
  halaman tembaga lama diarsipkan di `/landing` sebagai referensi.
  Alasan: premium, berani, tetap jujur (tanpa statistik/testimoni palsu).
- **Wajah produk**: mark Bit Pair + pita kotak (SVG/div, dari
  `assets/logo/`), angka tabular Jost, teks Jost, ticker pin live
  + feed event sebagai signature element.
- **Satu pertanyaan layar**: "device saya melaporkan apa sekarang?"
  Blok terbesar = pin live + grafik pin terpilih.

### Token desain (gelap / terang)

| Token | Gelap | Terang |
|---|---|---|
| `--ground` | `#0A0A0B` | `#F3F0E8` |
| `--surface` | `#131316` | `#FFFFFF` |
| `--raised` | `#1B1B1F` | `#E9E4D6` |
| `--border` / `--rule` | `#2A2A30` / `#141416` | `#D8D0BC` / `#EAE3D2` |
| `--text` / `--muted` | `#F2EFE9` / `#A7A7B0` | `#131315` / `#5B5B62` |
| `--accent` | `#5B79FF` | `#2038E6` (turunan teks agar kontras ≥ 4.5:1; grafis boleh kobalt murni) |
| `--primary` (tombol) | `#3B5BFF` teks putih | `#2038E6` teks putih |
| `--positive` / bg | `#3FC07A` / `#172A1D` | `#247B50` / `#DCFAE5` |
| `--negative` / bg | `#E5566F` / `#2C1A20` | `#C4242A` / `#FFEBE9` |

Catatan: nilai final dikunci saat implementasi T1 dan diverifikasi
dengan contrast checker (teks normal ≥ 4.5:1, besar ≥ 3:1).
Sumber arah visual yang mengikat: `DESIGN.md` di root repo
(palet, tipografi, radius, gerak, library, aturan anti-konflik CSS);
tabel di sini ringkasannya.

## Struktur tab & live-wiring

Enam tab di sidebar berlabel 240px (desktop) / topbar + lembar menu penuh (mobile).
Halaman detail hanya dicapai dari daftar, tidak duduk di tab. Tanpa sesi semua tab mengarah ke login;
device yang dipilih dibagikan antar tab.

Panah tegas = navigasi antar layar. Panah titik-titik = aliran data live.
Semua layar baca-tulis lewat REST (`/api/*`); pin live dan event hanya
lewat satu koneksi WS per device terpilih; perintah tulis kembali via REST.

```mermaid
flowchart TD
    LOGIN["Login — masuk / daftar"]
    MON["Monitor — pin live + grafik + event"]
    DEVS["Devices — daftar + status + tambah"]
    DET["Detail device"]
    DASH["Dashboards — daftar"]
    KANVAS["Kanvas dinamis"]
    HEALTH["Health — broker/db/mailer"]
    SET["Settings — tema, akun, server"]
    API[(REST API)]
    WS{{"WS /stream — 1 koneksi per device"}}

    LOGIN -->|"sesi valid"| MON
    MON <-->|"pilih + tambah device"| DEVS
    DEVS -->|"buka"| DET
    DET -.->|"kembali"| DEVS
    DASH -->|"buka"| KANVAS
    MON --- DASH
    MON --- HEALTH
    MON --- SET
    MON -.->|"subscribe pin + event"| WS
    WS -.->|"publish cmd via REST"| MON
    MON --- API
    DEVS --- API
    DET --- API
    PROV --- API
    DASH --- API
    KANVAS --- API
    HEALTH --- API
    SET --- API
```

| Tab | Berisi | Terhubung ke |
|---|---|---|
| Monitor | Pin live, grafik history, feed event, kirim perintah, strip kesehatan | Devices (ganti device pantauan; tambah bila kosong); Settings (tema/akun) |
| Devices | Daftar + status online/offline jujur + tambah device (token sekali tampil + salin) + hapus 2 tahap | Detail device (dipilih) |
| Detail device | Pin, grafik, perintah, status, hapus (dicapai dari daftar) | Kembali ke Devices |
| Dashboards | Daftar dashboard | Kanvas dinamis (W10) per dashboard |
| Health | Broker, db, mailer, statistik (sumber sama dengan strip Monitor) | Strip di Monitor memakai sumber data yang sama |
| Settings | Tema gelap/terang, akun + keluar, info server, status WS + sambung ulang | Dibuka dari rail/bottom-bar; tidak memutus pantauan |

## Peta fitur & sub-fitur

Semua kotak berstatus **Direncanakan** (0 selesai). Angka `0/N` = jumlah
sub-fitur selesai per fitur; diperbarui tiap checkpoint.

```mermaid
flowchart LR
    ROOT(["VOLTA. Webapp"])
    ROOT --> F1 & F2 & F3 & F4 & F5 & F6 & F7 & F8 & F9
    F1["Autentikasi · 0/5"] --> S1["Login<br/>Daftar akun<br/>Error validasi<br/>Keluar<br/>Ingat sesi"]
    F2["Monitor · 0/6"] --> S2["Strip kesehatan<br/>Pin live<br/>Grafik history<br/>Feed event<br/>Kirim perintah<br/>Pilih device"]
    F3["Devices · 0/4"] --> S3["Daftar + status<br/>Tambah + token<br/>Detail device<br/>Hapus device"]
    F4["Provision · gabung Devices"] --> S4["Tanpa tab sendiri<br/>Form tambah di layar Devices"]
    F5["Dashboards · 0/3"] --> S5["Daftar dashboard<br/>Kanvas dinamis<br/>Editor visual"]
    F6["Health · 0/2"] --> S6["Broker/db/mailer<br/>Statistik admin"]
    F7["Settings · 0/4"] --> S7["Tema gelap/terang<br/>Akun + keluar<br/>Info server<br/>Status WS + sambung ulang"]
    F8["Widget HTML · 0/3"] --> S8["Render sandbox<br/>Bridge postMessage<br/>Batas 64 KB"]
    F9["Berbagi terbuka · 3/3"] --> S9["Tautan per board<br/>Wajib login<br/>Lihat + kontrol"]
```

Pemetaan ke task: Auth→W2 · Monitor→W3–W6 · Devices→W4+W7+W8 (provisioning gabung ke halaman Devices, tanpa tab sendiri) ·
Dashboards→W10+W12 · Health→W3 · Settings→W14 ·
Widget HTML→W11 · Berbagi terbuka→S5+W13 (tanpa branding/kuota, keputusan open).

## Task List

### Fase 0 — Fondasi

#### Task W1: Scaffold webapp + sistem desain dua tema
**Description:** Inisialisasi Next.js (App Router, TS strict), Tailwind,
shadcn/ui, token CSS dua tema, font Jost + angka tabular, rail ikon
6 tab + bottom bar mobile, halaman kosong tiap view.

**Acceptance criteria:**
- [ ] `npm run build` lolos tanpa error TS
- [ ] Toggle tema gelap/terang bekerja, tersimpan, tanpa flash saat load
- [ ] Sidebar berlabel 240px desktop, topbar 48px + lembar menu di mobile; semua item punya label aksesibel

**Verification:**
- [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint`
- [ ] Manual: buka `/`, ganti tema, reload, cek tidak ada flash

**Dependencies:** tidak ada (baca `.taste-skill/app-webapp/direction.json` dulu)

**Files likely touched:**
- `webapp/` (scaffold baru)

**Estimated scope:** M (scaffold + tokens + shell)

#### Task W2: BFF proxy + auth
**Description:** Route handler `/api/[...path]` meneruskan ke
`VOLTA_API_URL` dengan header auth dari cookie httpOnly; halaman login /
daftar; `GET /api/ws-token` untuk token WS; logout menghapus cookie.

**Acceptance criteria:**
- [ ] Login berhasil menyimpan cookie httpOnly (bukan localStorage)
- [ ] Register lalu auto-login jalan
- [ ] Token salah / kadaluarsa mengembalikan ke login dengan pesan jelas
- [ ] `/api/ws-token` menolak tanpa sesi valid

**Verification:**
- [ ] Vitest untuk helper cookie/proxy + Playwright: login/logout
- [ ] Manual lawan server Rust asli di `localhost:9443`

**Dependencies:** W1

**Files likely touched:**
- `webapp/app/api/[...path]/route.ts`
- `webapp/app/api/ws-token/route.ts`
- `webapp/app/login/page.tsx`

**Estimated scope:** M (3–5 file)

### Checkpoint A — Fondasi
- [ ] Build + typecheck + lint hijau
- [ ] Login/logout end-to-end lawan server Rust asli
- [ ] Review arah visual (screenshot 1440 + 390) sebelum lanjut

### Fase 1 — Inti monitoring

#### Task W3: Shell + strip kesehatan
**Description:** Shell final (rail, bottom bar, judul per view), strip
kesehatan 5 sel dari `/healthz` + `/admin/stats`, freshness stamp.

**Acceptance criteria:**
- [ ] Strip menampilkan broker/db/mailer/pending/msgs (sel "device online" pindah ke W4, butuh daftar device)
- [ ] Server mati → kartu "unreachable" eksplisit, bukan angka basi
- [ ] Angka dihitung dari respons, bukan diketik manual

**Verification:**
- [ ] Playwright: matikan server → strip menunjukkan unreachable
- [ ] Manual: bandingkan angka dengan `curl /healthz`

**Dependencies:** W2

**Files likely touched:**
- `webapp/app/(shell)/layout.tsx`
- `webapp/components/health-strip.tsx`

**Estimated scope:** S (1–2 file)

#### Task W4: Daftar + pilih device
**Description:** Daftar device (nama, status online/offline jujur dari
`GET /devices/{id}/status`), selektor device aktif, state kosong
("belum ada device") dan error jaringan.

**Acceptance criteria:**
- [ ] Device offline tampil pill netral + teks, bukan angka basi
- [ ] Tanpa device: empty state + ajakan ke provisioning
- [ ] Pilih device mengganti seluruh konten monitor

**Verification:**
- [ ] Vitest untuk helper status/teks "x lalu"
- [ ] Manual: cabut device, pastikan pill berubah ≤ 30 dtk (batas sweeper server)

**Dependencies:** W2

**Files likely touched:**
- `webapp/components/device-list.tsx`
- `webapp/lib/format.ts`

**Estimated scope:** S (1–2 file)

#### Task W5: Pin live + kirim perintah
**Description:** Baris pin (nilai tabular kanan, "x lalu", penanda basi),
WS `/stream?token=` dengan reconnect backoff, feed event, form kirim
perintah (`PUT .../pins/{pin}`) dengan konfirmasi hasil/gagal.

**Acceptance criteria:**
- [ ] Nilai pin update live tanpa reload
- [ ] WS putus → indikator "Reconnecting", lalu pulih otomatis
- [ ] Kirim perintah sukses/gagal memberi umpan balik teks (bukan warna saja)
- [ ] Pin non-numerik tampil apa adanya, tidak merusak layout

**Verification:**
- [ ] Playwright lawan server + device uji (atau stub WS): kirim → pin berubah
- [ ] Manual: cabut kabel device, pastikan status offline ≤ ~30 dtk

**Dependencies:** W4 (butuh device terpilih)

**Files likely touched:**
- `webapp/hooks/use-device-stream.ts`
- `webapp/components/pin-list.tsx`
- `webapp/components/command-form.tsx`

**Estimated scope:** M (3–4 file)

#### Task W6: Grafik history
**Description:** Recharts (`LineChart` + 1 `Line` tembaga 2px, tanpa
legenda, tooltip kustom, `isAnimationActive` mati saat
`prefers-reduced-motion`) — override pemilik 2026-11-04 atas rencana
SVG buatan sendiri. Tick bulat di atas maksimum, label jam tidak
bertumpuk, hover dot + tooltip teks, rentang 1H/24H, state kosong jujur.

**Acceptance criteria:**
- [ ] Pin non-numerik diabaikan dengan catatan jumlah sampel
- [ ] Rentang kosong menampilkan garis nol + satu kalimat (bukan panel kosong)
- [ ] Hover menampilkan nilai + waktu; tidak ada label bertumpuk di 390px

**Verification:**
- [ ] Vitest untuk fungsi skala/tick (tick bulat, top di atas maks)
- [ ] Screenshot 1440 + 390 diperiksa manual

**Dependencies:** W4

**Files likely touched:**
- `webapp/components/history-chart.tsx`
- `webapp/lib/chart-scale.ts`

**Estimated scope:** M (2–3 file)

### Checkpoint B — Inti jalan
- [ ] Login → pilih device → pin live → kirim perintah → grafik, semua lawan server + device asli
- [ ] `npm run build && npx tsc --noEmit` hijau
- [ ] Screenshot 1440/768/390 diperiksa (tidak ada panel void, angka konsisten)

### Fase 2 — Lengkap

#### Task W7: Provisioning (gabung ke Devices, tanpa tab/rute sendiri)
**Description:** Form tambah device di layar Devices (satu layar kelola):
nama → ID + token sekali tampil dengan tombol salin + langkah flash;
tabel device dengan hapus dua tahap. `/provision` redirect ke `/devices`.

**Acceptance criteria:**
- [ ] Token hanya tampil sekali setelah create, plus tombol salin
- [ ] Hapus butuh konfirmasi kedua ("Sure?")
- [ ] ID panjang tampil 8 karakter + ellipsis, bukan tabel melebar

**Verification:**
- [ ] Playwright: create → token tampil → delete
- [ ] Manual: token hasil create dipakai provisioning firmware asli

**Dependencies:** W2

**Files likely touched:**
- `webapp/app/(shell)/devices/page.tsx` (daftar + form tambah + hapus, satu layar)
- `webapp/components/copy-button.tsx`

**Estimated scope:** S (1–2 file)

#### Task W8: Halaman detail device
**Description:** Satu device per halaman: pin + grafik + kirim perintah +
status + tombol hapus; navigasi daftar ↔ detail.

**Acceptance criteria:**
- [ ] Deep link `/devices/[id]` langsung membuka device benar
- [ ] ID tak dikenal → pesan jelas, bukan halaman kosong
- [ ] Layout ulang pakai komponen Fase 1 (tidak duplikasi logika)

**Verification:**
- [ ] Playwright: buka deep link langsung (tanpa klik dari daftar)
- [ ] Manual 390px: konten jadi satu kolom tanpa scroll horizontal

**Dependencies:** W4, W5, W6

**Files likely touched:**
- `webapp/app/(shell)/devices/[id]/page.tsx`

**Estimated scope:** S (1–2 file + reuse)

#### Task W9: Kontrol OTA
**Description:** Tombol mulai/stop OTA per device (`/ota/start|stop`),
status dari respons, konfirmasi sebelum mulai.

**Acceptance criteria:**
- [ ] Start/stop memanggil endpoint benar dan menampilkan hasilnya
- [ ] Gagal (device offline) tampil sebagai teks error, bukan diam

**Verification:**
- [ ] Playwright: start lalu stop, respons tercatat
- [ ] Manual lawan device asli bila tersedia

**Dependencies:** W4

**Files likely touched:**
- `webapp/components/ota-controls.tsx`

**Estimated scope:** XS (1 file)

### Task W12: Editor visual drag-and-drop + grid responsif

**Description:** Kanvas W10 bisa disusun langsung: library
`react-grid-layout` (`Responsive`, API terverifikasi) dengan breakpoint
`lg/md/sm/xs/xxs` → kolom `12/10/6/4/2`. Hanya layout `lg` yang disimpan
(`{x, y, w, h}` di `config` widget); breakpoint kecil mengalir otomatis.
Widget mengisi sel 100% (SVG `viewBox` ikut skala, grafik yang ada
tidak perlu diubah).

Sentuh (touchscreen): tiap widget punya gagang drag khusus (area grip
≥44 px, `touch-action: none` hanya di gagang agar kanvas tetap bisa
di-scroll), handle resize sudut kanan-bawah ≥44 px, plus mode eksplisit
Lihat/Ubah — mode Lihat menonaktifkan semua handle supaya tidak kegeser
saat scroll. Panel properti (pin, label, min/max, warna), tombol Simpan
eksplisit menulis yang berubah via PUT/POST/DELETE.

**Acceptance criteria:**
- [ ] Drag + resize jalan di mouse dan layar sentuh (uji sentuh asli)
- [ ] Ganti lebar viewport (desktop ↔ HP): layout mengalir tanpa overlap/hilang
- [ ] Refresh memuat susunan yang sama (bukti persistensi)
- [ ] Mode Lihat: scroll sentuh tidak menggeser widget sama sekali
- [ ] Perubahan tak sengaja tidak tersimpan (tombol Simpan eksplisit)

**Verification:**
- [ ] Playwright + sentuh: tambah → drag → resize → reload → susunan sama → hapus
- [ ] Manual di HP: scroll kanvas, geser widget via gagang, cubit tidak pecah

**Dependencies:** W8, W10 (butuh renderer + API widget lengkap)

**Files likely touched:**
- `webapp/app/(dashboards)/[id]/edit/page.tsx` (atau mode edit di kanvas)
- `webapp/components/canvas-grid.tsx` (wrapper `ResponsiveGridLayout`)
- `webapp/components/widget-palette.tsx`
- `webapp/components/widget-props.tsx`

**Estimated scope:** M (4 file)

### Task W13: Berbagi board terbuka (keputusan pemilik: open untuk semua)

**Description:** Satu tautan share per board (`POST/GET/DELETE
/dashboards/:id/share`), halaman `/s/[token]` WAJIB login
(`?next=` kembali setelah masuk) lalu membuka board penuh: pin live
via WS dengan token share, kirim perintah + history lewat BFF
`/api/share/[token]/...`. Token share berlaku sebagai Bearer untuk
device-device yang terikat widget board itu saja. Struktur board tetap
milik pemilik. TANPA peran viewer, TANPA branding, TANPA kuota.

**Acceptance criteria:**
- [x] Buka `/s/{token}` tanpa sesi → dialihkan ke login, kembali setelah masuk
- [x] Token share: lihat + kontrol device dalam cakupan; di luar cakupan → 404
- [x] Token dicabut → halaman berbagi jelas tidak valid
- [x] Tiap board indicasi "terbagikan" di daftar; satu board = satu tautan

**Verification:**
- [x] `cargo test --lib http` (buat → baca publik → cakupan → cabut → mati)
- [ ] Playwright: buat share → buka wajib login → kontrol → cabut → tidak valid

**Dependencies:** W8 (detail sebagai basis view), S5 server (selesai)

**Files likely touched:**
- `webapp/app/s/[token]/page.tsx`
- `webapp/components/public-board-client.tsx`
- `webapp/components/share-section.tsx`
- `webapp/app/api/share/[token]/[...rest]/route.ts`

### Task W14: Pengaturan (tema, akun, server)

**Description:** Layar Settings: toggle tema gelap/terang (tersimpan),
baris akun (email + tombol Keluar), info server (URL basis + status
terhubung), status koneksi WS + tombol "Sambung ulang" manual.

**Acceptance criteria:**
- [ ] Ganti tema langsung berlaku dan bertahan setelah reload
- [ ] Keluar menghapus sesi dan mengarah ke login
- [ ] WS putus terlihat statusnya; tombol sambung ulang menyambung kembali

**Verification:**
- [ ] Playwright: ganti tema → reload → tema bertahan
- [ ] Manual: matikan server → status WS berubah → nyalakan → sambung ulang manual jalan

**Dependencies:** W1 (shell), W5 (status WS dipakai ulang)

**Files likely touched:**
- `webapp/app/(shell)/settings/page.tsx`
- `webapp/components/theme-toggle.tsx`

**Estimated scope:** S (1–2 file)

#### Task W10: Dashboard dinamis ala no-code engine
**Description:** Render dashboard murni dari definisi server
(`GET /dashboards`, `GET /dashboards/{id}/widgets` → `{id, kind, pin,
config}`), tanpa redeploy saat layout berubah. Registry widget:
satu file per kind (`widgets/gauge.tsx`, `button.tsx`, `switch.tsx`,
`slider.tsx`, `labeled-value.tsx`, `led.tsx`, `history-chart.tsx`) +
manifest (nama, skema config, ukuran default). Posisi/ukuran dibaca dari
`config` (`{x, y, w, h, label, min, max, unit}`); grid 12 kolom.
Binding live reuse hook WS Fase 1. Jujur seperti Blynk: *layout dan isi*
berubah tanpa rilis ulang; *jenis widget baru* tetap butuh kode klien.

**Acceptance criteria:**
- [ ] Tambah/hapus/pindah widget via API langsung tercermin tanpa rebuild
- [ ] Kind tak dikenal tampil sebagai kartu "kind belum didukung", bukan crash
- [ ] Live binding dan kirim perintah jalan untuk semua kind interaktif

**Verification:**
- [ ] Playwright: buat dashboard via API mentah, buka webapp, semua widget tampil + live
- [ ] Manual: ubah `config` widget di DB, refresh, layout ikut berubah

**Dependencies:** W4, W5, W6

**Files likely touched:**
- `webapp/components/widgets/*.tsx`
- `webapp/lib/widget-registry.ts`
- `webapp/app/(shell)/dashboards/[id]/page.tsx`

**Estimated scope:** M (registry + 7 renderer + halaman)

**Data contoh (bukan hardcode):** `VOLTA_SEED_DEMO=1` saat jalan dev
menulis 2 device + 1 board + 6 widget milik admin ke SQLite
(`src/seed.rs`, idempoten, semua bernama "Contoh"). Kanvas selalu baca
dari API; tidak ada data board/widget di kode webapp.

#### Task W11: Widget HTML kustom (sandbox)
**Description:** Widget kind `html` berisi `{html, css?, js?}` yang
dirender dalam `<iframe sandbox="allow-scripts" srcDoc=...>` tanpa
`allow-same-origin`: terisolasi, tak bisa menyentuh DOM/storage induk.
Jembatan `postMessage` dua arah yang sempit: widget → induk hanya
`{type:"cmd", pin, value}` (induk yang validasi + teruskan via PUT);
induk → widget `{type:"pin", pin, value}` tiap update. Batas ukuran
64 KB per field (cek klien; cap server menyusul bila perlu).

**Acceptance criteria:**
- [ ] Contoh denah/unit test: HTML kustom bisa baca pin dan kirim perintah
- [ ] JS widget tidak bisa akses `parent`, cookie, atau localStorage induk
- [ ] Melebihi 64 KB ditolak dengan pesan jelas sebelum tersimpan

**Verification:**
- [ ] Playwright: suntik `parent.document` dari widget → harus gagal terisolasi
- [ ] Manual: pasang contoh denah denah + tombol dari HTML murni

**Dependencies:** W10 (butuh registry + binding)

**Files likely touched:**
- `webapp/components/widgets/html-widget.tsx`
- `webapp/lib/widget-bridge.ts` (protokol postMessage)

**Estimated scope:** S (2 file + contoh)

### Checkpoint C — Selesai
- [ ] Semua acceptance criteria W1–W14 terpenuhi
- [ ] Gate visual: `lint.mjs --app` 0 FAIL, `inspect.mjs --app` 0 FAIL di 1440/768/390, kritik 3 ronde tercatat
- [ ] Kontras teks ≥ 4.5:1 (cek tool), keyboard penuh (Tab/Enter/Escape), state empty/loading/error ada di tiap blok data
- [ ] Tidak ada data contoh/invented di mana pun; angka lolos uji "total dari baris"
- [ ] README webapp + README root diperbarui

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tampilan default shadcn menempel | Medium | Token CSS diganti total di T1; lint visual menolak radius/bayangan default |
| Kontrak API server berubah | Medium | BFF mewarisi bentuk respons; pin versi server di README webapp; uji lawan server asli tiap checkpoint |
| Token di URL WS tercatat di log | Low | Token query hanya untuk upgrade WS (sudah didukung server); dokumentasikan; pertimbangkan masa berlaku pendek di server |
| Font Google offline | Low | Fallback stack system-ui + mono sistem; tetap lolos tanpa unduhan |
| Server mati saat demo | Low | State "unreachable" eksplisit di tiap blok (sudah jadi pola di T3–T6) |

## Open Questions

- Target hosting webapp (mesin yang sama / Vercel / lain)? Menentukan `VOLTA_API_URL` + strategi build. Default rencana: env var saat build, didokumentasikan di webapp README.
- Apakah dashboard/widget masuk v1? Ya — masuk sebagai W10–W13 (keputusan: no-code engine + HTML widget + editor + wajah SaaS).
- Retensi history default grafik (1H/24H) cukup, atau perlu 7D? Butuh jawaban sebelum T6 final (default: cukup).

## Verification (global)

- [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint` hijau tiap checkpoint
- [ ] Playwright critical path hijau tiap checkpoint
- [ ] Uji manual selalu lawan server Rust + device/ESP32 asli, bukan mock, untuk klaim "jalan"
