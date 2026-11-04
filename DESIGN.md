# DESIGN.md — VOLTA. Web (landing + app)

Sumber arah visual untuk `webapp/` (Next.js App Router + TSX). Baca
bersama `tasks/plan-webapp.md` (kontrak API, art direction `one-motif`
noir + kobalt, wajah Bit Pair). File ini memutuskan: palet, tipografi,
radius, gerak, library, dan aturan anti-konflik CSS. Semua yang tidak
diputuskan di sini mengikuti plan webapp.

Dial: **ENERGY 3 / RHYTHM 2 / MOTION 2** — berani tapi tertib
(motif tunggal skala besar, komposisi disiplin).
Berlaku untuk landing `/` maupun app.

Keputusan pemilik 2026-11-04: varian `/landing` (satu motif, noir +
kobalt, Jost, WebGL 3D) dipromosikan menjadi halaman utama `/`.
Halaman tembaga lama diarsipkan di `/landing` sebagai referensi.

## 1. Identitas yang dipakai ulang

- **Motif Bit Pair**: dua kotak (solid = 1/HIGH, ring = 0/LOW) sebagai
  satu-satunya motif grafis berulang — pita kotak hero/footer, thumb
  slider kotak, penanda plus/minus akordeon, medan kubus 3D.
  Jangan menggambar motif lain.
- **Tagline**: "Precision in Every Pulse." Satu kali per halaman,
  di footer.
- **Logo**: pakai file master dari `assets/logo/` apa adanya
  (simbol + wordmark Jost untuk varian). Dilarang mewarnai ulang,
  memutar, menambah bayangan/outline/gradien, atau mengetik ulang
  wordmark.
- **Open source**: repo `https://github.com/Andrisetianabrata/volta-IoT`
  (lisensi MIT, branch `main`). CTA utama landing = Install/Download,
  bukan formulir akses. Perintah install dan port yang tampil di
  halaman wajib sama dengan `docs_INSTALL.md` dan flag CLI
  (`--data-folder`).

## 2. Palet (satu aksen: kobalt)

| Nama | HEX gelap | HEX terang | Peran |
|---|---|---|---|
| Ground | `#0A0A0B` | `#F3F0E8` | Latar halaman |
| Surface | `#131316` | `#FFFFFF` | Panel, kartu, tile |
| Raised | `#1B1B1F` | `#E9E4D6` | Stage, hover |
| Border / Rule | `#2A2A30` / `#141416` | `#D8D0BC` / `#EAE3D2` | Garis netral |
| Ink | `#F2EFE9` | `#131315` | Teks utama |
| Muted | `#A7A7B0` | `#5B5B62` | Teks sekunder (lolos 4.5:1) |
| Accent | `#5B79FF` | `#2038E6` | **Satu-satunya aksen**: garis data, tahap aktif, dot status |
| Tombol isi | `#3B5BFF` | `#2038E6` | Teks tombol selalu putih (`#FFFFFF`, lolos 4.5:1) |

Aturan pakai (mengikat):
- Tanpa gradien, tanpa glow, tanpa glassmorphism. Kedalaman hanya dari
  **flat + 1px + satu tingkat tone**.
- Kobalt untuk teks hanya bila lolos kontras: di kedua tema pasangan
  di atas terverifikasi tool (normal ≥ 4.5:1). Aksen terang `#8a6d1f`
  versi lama dilarang (gagal 4.5:1 sebagai teks).
- Kubus 3D memakai turunannya: atas `#EDEFF5`, sisi `#2E4BFF`,
  dasar `#0A0A12` (grafis, bukan teks).

### Token tema (sumber tunggal kebenaran)

```css
.landing-variant / :root / [data-theme="light"] {
  --ground: #F3F0E8;  --surface: #FFFFFF;  --raised: #E9E4D6;
  --border: #D8D0BC;  --rule: #EAE3D2;      --control: #D8D0BC;
  --text: #131315;    --muted: #5B5B62;    --faint: #7A766C;
  --accent: #2038E6;  --accent-ink: #FFFFFF;
  --primary: #2038E6; /* tombol: isi kobalt, teks putih */
}
.landing-variant / [data-theme="dark"] {
  --ground: #0A0A0B;  --surface: #131316;  --raised: #1B1B1F;
  --border: #2A2A30;  --rule: #141416;      --control: #2A2A30;
  --text: #F2EFE9;    --muted: #A7A7B0;    --faint: #7E7E88;
  --accent: #5B79FF;  --accent-ink: #FFFFFF;
  --primary: #3B5BFF; /* tombol: isi kobalt, teks putih */
}
```

Catatan: halaman utama memakai scope `.landing-variant` sehingga
token varian menimpa primitif shadcn tanpa menyentuh file komponen.
Halaman arsip `/landing` memakai token tembaga lama (tetap berlaku
di scope-nya, tidak dikembangkan lagi).

## 3. Tipografi (Jost + angka tabular)

| Peran | Font | Alasan |
|---|---|---|
| Display + UI + teks | **Jost** (400/500/700, uppercase display, tracking -0.03, leading 0.9) | Geometris tegas, cocok untuk motif kotak; satu family cukup |
| Angka, telemetri | Jost + `font-variant-numeric: tabular-nums` | Angka tidak goyang saat live-update; tanpa monospace di label (aturan house) |

Muat via `next/font` (self-host, subset latin, `display: swap`).
Skala display landing: hero 40–60px (desktop) / 36–40px (mobile),
satu ukuran dominan per layar, headline ≤ 2 baris di semua lebar.

## 4. Radius — nyaris nol (motif kotak)

**Keputusan: `--radius: 0` untuk permukaan varian.**
Alasan: geometri Bit Pair 100% sudut siku — radius apa pun
bertrabrakan dengan motif; kartu, panel, tombol, input: kotak penuh.
- Pengecualian fungsional: status dot → lingkaran penuh.
- Komponen shadcn yang membawa radius bawaan (rounded-lg = 2px)
  dioverride ke 0 lewat prop `style` di titik pakai, bukan dari CSS
  global (lihat §8).

## 5. Tema gelap + terang

- Satu set token di §2, diganti via atribut `data-theme` di `<html>`.
  Transisi warna instan (tanpa fade tema) agar tidak berkedip.
- Pilihan tersimpan (`localStorage`), default mengikuti
  `prefers-color-scheme`; toggle selalu terlihat di navbar.
- Kedua tema wajib lolos gate yang sama (kontras, inspeksi
  1440/768/390). Tema bukan "mode hemat".

## 6. Gerak & WebGL (medan Bit 3D + ticker)

Prinsip: gerak menjelaskan, bukan menghias. Diam total bila
`prefers-reduced-motion`.

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Medan kubus Bit 3D hero (perspektif nyata, 240 kubus, tinggi mengikuti waktu + pointer + scroll) | **`ogl`** (paket `ogl`, tanpa post-processing) | Satu-satunya lib 3D; cukup untuk shader kustom + instans + DPR handling. three.js ditolak: ratusan KB untuk latar |
| Scroll halus | **`lenis`** (paket `lenis`, `autoRaf: true`), progressive enhancement | Jangan ubah `respectReducedMotion`; `Save-Data` menonaktifkan total |
| Reveal section, hover, mikro-interaksi | Hook `useReveal` sendiri (IntersectionObserver) | `framer-motion` ditolak: ratusan KB untuk IO + transisi CSS |
| Ticker pin live | CSS `translateX` loop 36s, jeda saat hover/reduced-motion | Signature element; nilai simulasi berlabel demo |
| Grafik pin/history | **`recharts`** (`LineChart`, 1 `Line` aksen 2px, tanpa legenda, tooltip kustom) — override pemilik 2026-11-04 atas rencana SVG buatan sendiri | Deklaratif + aksesibilitas bawaan; gaya tetap (1 garis, tick bulat, tanpa legenda) |

Aturan WebGL (mengikat):
- Satu kanvas per medan, `antialias: true` (geometri tajam),
  `alpha: true` (ground dari token tema); DPR dibatasi
  `min(devicePixelRatio, 1.75)`; `setSize()` ulang tiap resize.
- Animasi terikat waktu + pointer + progres scroll; pause saat kanvas
  di luar viewport (`IntersectionObserver`), saat tab tersembunyi,
  dan saat `prefers-reduced-motion` (satu frame statis).
- Cleanup saat unmount wajib: `cancelAnimationFrame`, hapus listener,
  buang geometri/program. Dilarang `canvas.remove()` (melawan React
  StrictMode — pelajaran insiden buffer 300x150).
- Pelajaran yang dicatat: `setSize` OGL menulis inline style dan
  mengunci buffer bila dipanggil sebelum CSS termuat — selalu kosongkan
  inline style setelahnya + `requestAnimationFrame(resize)` susulan.
- Seluruh konten tetap terbaca tanpa WebGL (kanvas dekoratif murni,
  `aria-hidden`, teks di atasnya HTML biasa).

Aturan Lenis (terverifikasi dari sumber resmi):
- Wajib sertakan CSS resmi lenis (`lenis/dist/lenis.css`).
- `syncTouch` bawaan mati = sentuhan pakai scroll native.
- Jangan set `respectReducedMotion: false`.

Gerak UI: reveal `translateY(18px) + opacity`, sekali jalan
(`once: true`), stagger ≤ 90 ms; hover hanya perubahan warna/border
(token, tanpa transform melompat); tidak ada autoplay/carousel
(kecuali ticker yang dijeda).

## 7. shadcn — pakai, tapi dirombak total

shadcn dipakai sebagai **primitif perilaku + aksesibilitas**
(focus, keyboard, ARIA, form), bukan sebagai tampilan.

| Komponen shadcn | Yang dirombak |
|---|---|
| Button (5 varian: default/accent/outline/ghost/destructive; 4 ukuran), Input, Slider (thumb kotak 22px), Accordion (plus/minus dari 2 bar, tanpa chevron), Badge (dot + label fungsional) | radius → 0; shadow → none; gradien → flat; warna → token §2; focus-ring → outline kobalt 2px |

Yang **tidak** diambil dari shadcn: chart, carousel, gaya bawaan apa pun
yang memakai bayangan/gradien/radius besar.

## 8. Arsitektur anti-konflik CSS (mengikat)

Aliran satu arah — **token → utility → komponen** — ditegakkan oleh
cascade layer bawaan Tailwind v4 (jangan dilawan):
`theme → base → components → utilities`.

1. **Token hanya di `@theme`** (`webapp/app/globals.css`) + override
   scope `.landing-variant` (`webapp/app/variant.css`): warna, font,
   `--radius`. Tidak ada token di file lain.
2. **Base (`@layer base`)**: hanya reset + `body` + selektor fokus
   global. Dilarang menarget class komponen.
3. **Komponen shadcn di `components/ui/`**: hanya utility Tailwind +
   variabel token; varian via `cva`, bukan override CSS.
   Dilarang `!important` di seluruh codebase.
4. **App (`components/`, `app/`)**: komposisi primitif shadcn, tanpa
   menimpa interiornya; radius non-standar (0) lewat prop `style`
   di titik pakai.
5. **Satu-satunya pengecualian global**: keyframes animasi dan
   `.reveal`/`.ticker` states di `styles/motion.css`, tanpa warna/radius.
6. **Tema**: hanya mengganti nilai variabel di selektor
   `[data-theme]` — tidak ada override per-komponen per-tema, plus
   `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`

Uji konflik: `npx tsc`, build Next, lalu inspeksi visual kedua tema —
bila satu komponen beda rupa tanpa token yang berubah, itu bug
lapisan, bukan "tweak CSS".

## 9. Responsif & performa HP

- Breakpoint: `sm 640 / md 768 / lg 1024 / xl 1440`.
- Target sentuh ≥ 44px (thumb slider 22px diberi hit area `py-5`).
- Grid kolaps: `min-w-0` wajib di tiap sel grid agar konten lebar
  (pita Bit, chart) tidak mendorong overflow — pelajaran insiden
  overflow 802px di viewport 500px.
- Media: SVG logo langsung; PNG hanya favicon.
- JS di bawah lipatan di-`dynamic import`; font subset latin saja.
- Budget: total JS landing < 150 kB gzip (terakhir terukur 328 kB
  uncompressed — belum diverifikasi analyzer, jangan diklaim).

## 10. Aksesibilitas minimum (non-negosiasi)

- Kontras teks ≥ 4.5:1 (besar ≥ 3:1), diverifikasi tool, bukan mata.
  Pasangan terukur: gelap 17.24/8.23, terang 16.29/5.27 (teks/muted).
- Focus visible kobalt 2 px di semua kontrol, kedua tema.
- `prefers-reduced-motion`: matikan lenis + WebGL + ticker + reveal
  (konten langsung tampil).
- Form berlabel, error teks (bukan warna saja); ikon dekoratif
  `aria-hidden`; kanvas 3D `aria-hidden`.

## 11. Gate penerimaan file ini

- [x] Setiap token punya pasangan kontras terverifikasi tool.
- [x] Radius 0 + pengecualian dot disepakati.
- [x] Daftar library final: `ogl`, `lenis`, `recharts`, tanpa framer-motion.
- [x] CTA landing = Install/Download ke repo, perintah = `docs_INSTALL.md`.
- [ ] Budget JS < 150 kB gzip terverifikasi analyzer (terbuka).
