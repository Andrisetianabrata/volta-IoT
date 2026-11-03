# DESIGN.md — VOLTA. Web (landing + app)

Sumber arah visual untuk `webapp/` (Next.js App Router + TSX). Baca
bersama `tasks/plan-webapp.md` (kontrak API, art direction `data-terminal`,
wajah Bit Pair). File ini memutuskan: palet, tipografi, radius, gerak,
library, dan aturan anti-konflik CSS. Semua yang tidak diputuskan di sini
mengikuti plan webapp.

Dial: **ENERGY 2 / RHYTHM 2 / MOTION 2** — percaya diri tapi tertib
(permukaan teknis, bukan galeri). Berlaku untuk landing maupun app.

## 1. Identitas yang dipakai ulang

- **Motif Bit Pair**: dua kotak (solid = 1/HIGH, ring = 0/LOW) sebagai
  satu-satunya motif grafis berulang — hero landing, mark rail/sidebar,
  favicon, empty-state. Jangan menggambar motif lain.
- **Bit-stop** (titik kotak) sebagai penutup tegas: dipakai sebagai
  penanda akhir section hero dan bullet kustom daftar fitur.
- **Tagline**: "Precision in Every Pulse." (EN) / "Kendali Presisi.
  Eksekusi Tanpa Kompromi." (ID). Satu saja per halaman, di hero.
- **Logo**: pakai file master dari `../LOGO/kit/` apa adanya
  (`volta-horizontal.svg` terang, `-reversed` untuk gelap). Dilarang
  mewarnai ulang, memutar, menambah bayangan/outline/gradien, atau
  mengetik ulang wordmark (sudah outline vektor permanen).

## 2. Palet (aksen hanya dari logo)

| Nama | HEX | Peran |
|---|---|---|
| Volta Ink | `#111111` | Teks utama + ground mode gelap |
| Volta Copper | `#C07A24` | **Satu-satunya aksen**, maks ~3% piksel: garis seleksi 1px, hue data utama, CTA primer |
| Volta Steel | `#7C8288` | Teks sekunder, border netral |
| Volta Paper | `#F5F3EE` | Ground mode terang |

Aturan pakai (mengikat):
- Tanpa gradien, tanpa glow, tanpa glassmorphism. Kedalaman hanya dari
  **flat + garis 1px + satu tingkat tone** (sesuai larangan brand).
- Copper untuk teks hanya bila lolos kontras: di ground gelap Copper
  murni lolos AA; di ground terang pakai turunan teks `#8A5A1B`
  (rgb terdekat yang lolos 4.5:1 — wajib diverifikasi ulang dengan
  contrast checker saat T1, bukan angka final buta).
- Pasangan resmi logo tetap berlaku untuk lockup; di dalam UI,
  `Steel` untuk teks sekunder/border, bukan untuk aksen.

### Token tema (sumber tunggal kebenaran)

```css
:root / [data-theme="light"] {
  --ground: #F5F3EE;  --surface: #FFFFFF;  --raised: #EDEAE3;
  --border: #E3DED4;  --rule: #EFEBE2;     --control: #C9C2B4;
  --text: #111111;    --muted: #5F6368;    --faint: #8A8478;
  --accent: #C07A24;  --accent-ink: #8A5A1B;
  --primary: #111111; /* tombol: isi Ink, teks Paper */
}
[data-theme="dark"] {
  --ground: #101012;  --surface: #17171A;  --raised: #1F1F23;
  --border: #2B2B2E;  --rule: #1C1C1F;     --control: #444444;
  --text: #F5F3EE;    --muted: #A8A8AB;    --faint: #8A8A8E;
  --accent: #C07A24;  --accent-ink: #C07A24;
  --primary: #F5F3EE; /* tombol: isi Paper, teks Ink */
}
```

## 3. Tipografi (maksimal 2 family)

| Peran | Font | Alasan |
|---|---|---|
| Display + UI + teks | **Montserrat** (400/500/600/700/800) | Satu keluarga dengan wordmark (Montserrat Black); cukup satu untuk semua teks agar hitungan family tetap 2 |
| Angka, telemetri, kode, log | **IBM Plex Mono** (400/500) | Digit tabular + nuansa instrumen; angka pin/valuta tidak goyang saat live-update |

Muat via `next/font` (self-host, subset latin, `display: swap`).
Angka live **wajib** `font-variant-numeric: tabular-nums`.
Skala display landing: hero 40–64px (desktop) / 32–40px (mobile),
satu ukuran dominan per layar.

## 4. Radius — rekomendasi: pakai, tapi nyaris tajam

**Keputusan: `--radius: 2px` sebagai satu-satunya token radius.**
Alasan: geometri Bit Pair 100% sudut siku — radius besar akan
bertabrakan dengan identitas; radius 0 total terasa kasar di form.
2px memberi kesan presisi/instrumental sekaligus tetap "disentuh
desainer", dan membedakan dari SaaS generik (8–16px).

- Kartu, tombol, input, dialog: `2px`. Satu nilai, tanpa variasi.
- Pengecualian fungsional (bukan dekorasi): status dot, badge/pill
  kecil, avatar, toggle thumb → `9999px` (bentuknya menuntut lingkaran).
- Dilarang: radius per-komponen seenaknya, pill button besar, kartu
  12–24px.

## 5. Tema gelap + terang

- Satu set token di §2, diganti via atribut `data-theme` di `<html>`.
  Transisi warna instan (tanpa fade tema) agar tidak berkedip.
- Pilihan tersimpan (`localStorage`), default mengikuti
  `prefers-color-scheme`; toggle selalu terlihat di navbar/shell.
- Kedua tema wajib lolos semua gate yang sama (kontras, inspeksi
  1440/768/390). Tema bukan "mode hemat": tidak ada fitur yang hilang
  di salah satu tema.

## 6. Gerak & WebGL (landing interaktif, ringan di HP)

Prinsip: gerak menjelaskan, bukan menghias. Target budget JS hero
< 50 KB gzip; frame ≤ 16 ms di HP kelas menengah; diam total bila
`prefers-reduced-motion`.

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Kanvas hero WebGL (latar medan sinyal Bit-Pair yang merespons scroll) | **`ogl`** (paket `ogl`, tanpa post-processing) | Satu-satunya lib 3D; cukup untuk shader kustom + DPR/resize handling. three.js/react-three-fiber ditolak: ratusan KB untuk latar |
| Scroll halus agar scrub terasa premium | **`lenis`** (paket `lenis`, `autoRaf: true`), progressive enhancement | Jangan matikan manual saat reduced-motion: bawaan lenis sudah menonaktifkan smoothing-nya sendiri (`respectReducedMotion` default true — jangan ubah); `Save-Data` tetap menonaktifkan total |
| Reveal section, hover, mikro-interaksi | Hook `useReveal` sendiri (IntersectionObserver, ±30 baris) | `framer-motion` ditolak: ratusan KB untuk animasi yang bisa dicapai IO + transisi CSS |
| Grafik pin/history | SVG buatan sendiri (keputusan plan, tidak berubah) | Data renggang: SVG lebih murah dari konteks WebGL per grafik |

Budget JS hero < 50 KB gzip **termasuk** ogl+lenis — diverifikasi
dengan bundle analyzer saat T1, bukan klaim.

Aturan WebGL (mengikat, terverifikasi dari sumber resmi OGL):
- Satu kanvas, satu shader, `antialias: false`, `alpha: false`
  (clear color = token ground tema aktif; digambar ulang tiap ganti tema).
  Tanpa post-processing; DPR dibatasi `min(devicePixelRatio, 1.75)`
  via opsi konstruktor `new Renderer({ dpr })`, lalu `setSize()` ulang
  tiap resize dan tiap ganti tema.
- Animasi terikat progres scroll (uniform `u_scroll`, di-update per
  frame dari nilai lenis) bukan waktu semata, agar terasa interaktif,
  bukan video.
- Pause saat kanvas di luar viewport (`IntersectionObserver`),
  saat tab tersembunyi, dan saat `prefers-reduced-motion`
  (tampilkan frame statis/poster sebagai fallback).
- Cleanup saat unmount wajib (StrictMode me-mount dua kali):
  `cancelAnimationFrame`, `program.remove()`, hapus kanvas dari DOM.
- Seluruh konten tetap terbaca tanpa WebGL (kanvas dekoratif murni,
  `aria-hidden`, teks di atasnya HTML biasa).

Aturan Lenis (terverifikasi dari sumber resmi):
- Wajib sertakan CSS resmi lenis (`lenis/dist/lenis.css`) agar tidak
  ada overflow/clipping aneh.
- `syncTouch` bawaan mati = sentuhan pakai scroll native (bagus untuk
  HP, jangan dinyalakan kecuali ada alasan tertulis).
- Jangan set `respectReducedMotion: false`; baca
  `lenis.prefersReducedMotion` untuk menghentikan scrub WebGL kita
  sendiri.

Gerak UI: reveal `translateY(18px) + opacity`, sekali jalan
(`once: true`), stagger ≤ 90 ms; hover hanya perubahan warna/border
(token, tanpa transform melompat); tidak ada autoplay/carousel.

## 7. shadcn — pakai, tapi dirombak total

shadcn dipakai sebagai **primitif perilaku + aksesibilitas**
(focus, keyboard, ARIA, form), bukan sebagai tampilan.

| Komponen shadcn | Yang dirombak |
|---|---|
| Button, Input, Select, Switch, Tabs, Table, Dialog, Tooltip, Badge, Card | radius → token 2px; shadow → none; gradien → flat; warna → token §2; focus-ring → outline Copper 2px |

Yang **tidak** diambil dari shadcn: chart, carousel, gaya bawaan apa pun
yang memakai bayangan/gradien/radius besar.

## 8. Arsitektur anti-konflik CSS (mengikat)

Masalah yang dicegah: CSS global menimpa komponen dan sebaliknya.
Aturannya satu arah aliran — **token → utility → komponen** —
ditegakkan oleh cascade layer bawaan Tailwind v4 (jangan dilawan):

Urutan layer (rendah → tinggi, yang kanan menang bila selektor setara):
`theme → base → components → utilities` (urutan bawaan Tailwind v4,
terverifikasi di dokumentasi resmi — jangan dilawan, jangan disusun
ulang). Karena itu:

1. **Token hanya di `@theme`** (`webapp/app/globals.css`): warna,
   font, `--radius`, breakpoint. Tidak ada token di file lain.
2. **Base (`@layer base`)**: hanya reset + `body` (background/text
   dari token) + selektor fokus global. Dilarang menarget class
   komponen (`[data-slot]`, `.btn`, dsb.).
3. **Komponen shadcn di `components/ui/`**: hanya memakai utility
   Tailwind + variabel token; varian via `cva`, bukan override CSS.
   Dilarang `!important` di seluruh codebase (lint: tolak stringnya).
4. **App (`components/`, `app/`)**: komposisi primitif shadcn, tanpa
   menimpa interiornya; kustomisasi lewat props/variant yang disediakan.
5. **Satu-satunya pengecualian global**: keyframes animasi dan
   `.reveal` states — didefinisikan sekali di `styles/motion.css`,
   tanpa warna/radius (hanya transform/opacity).
6. **Tema**: hanya mengganti nilai variabel di selektor
   `[data-theme]` — tidak ada override per-komponen per-tema.
   Wajib tambah satu baris ini agar varian `dark:` mengikuti atribut
   (bawaan v4 mengikuti OS — tanpa baris ini tema manual tidak jalan):
   `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`
   Bila satu kasus butuh beda rupa antar-tema, jadikan token baru.

Uji konflik: `npx tsc`, build Next, lalu inspeksi visual kedua tema —
bila satu komponen beda rupa tanpa token yang berubah, itu bug
lapisan, bukan "tweak CSS".

## 9. Responsif & performa HP

- Breakpoint: `sm 640 / md 768 / lg 1024 / xl 1440`. Kanvas grid
  dashboard: 12 kolom desktop → 1 kolom HP; rail menjadi bottom-bar.
- Target sentuh ≥ 44px; tidak ada hover-only interaction.
- Media: SVG logo langsung (tanpa raster ganda); PNG hanya favicon/
  PWA icon dari `kit/`.
- JS di bawah lipatan di-`dynamic import`; font subset latin saja.
- Budget: LCP < 2.5 s di Moto G4 simulasi; total JS landing < 150 KB gzip.

## 10. Aksesibilitas minimum (non-negosiasi)

- Kontras teks ≥ 4.5:1 (besar ≥ 3:1), diverifikasi tool, bukan mata.
- Focus visible Copper 2 px di semua kontrol, kedua tema.
- `prefers-reduced-motion`: matikan lenis + WebGL + reveal (konten
  langsung tampil).
- Form berlabel, error teks (bukan warna saja); tabel memakai `th`
  + `scope`; ikon dekoratif `aria-hidden`.

## 11. Gate penerimaan file ini

Sebelum implementasi T1 webapp, DESIGN.md dianggap final bila:
- [ ] Setiap token punya pasangan kontras terverifikasi tool.
- [ ] Radius 2px + pengecualian pill disepakati (atau diubah di sini).
- [ ] Daftar library final: `ogl`, `lenis` (paket `lenis`, `autoRaf: true`, CSS resmi diimpor), tanpa framer-motion.
- [ ] Tidak ada bagian yang bergantung pada gambar/foto yang belum ada.
