# DESIGN-APP.md — VOLTA. App (dashboard + auth + shell)

Dokumen sumber kebenaran untuk layar app: `/login`, `/monitor`, `/devices`,
`/dashboards`, `/health`, `/settings`. Landing (`/` dan `/landing`) tetap
mengikuti `DESIGN.md` + `variant.css` dan dilarang ditiru di sini.

Status: disepakati 2026-11-05. Radius 8px. Seluruh shell app ikut gaya ini.

## 1. Prinsip (dipinjam dari taste, bukan dari landing)

1. **App bukan landing.** Tidak ada motif Bit Pair, tidak ada pita kotak,
   tidak ada Jost uppercase, tidak ada medan 3D/ticker di app.
2. **Satu sistem.** Satu pasang tombol, satu gaya kartu, satu skala radius,
   satu tampilan link. Tidak ada rupa kedua.
3. **Copy polos.** Judul menamai benda ("Dashboards", "Masuk ke VOLTA."),
   tombol kata kerja + objek ("Buat board", "Tambah device"). Tanpa klaim palsu.
4. **Tepi sama.** Semua blok konten di garis `.wrap` yang sama
   (`max-w-6xl`, `px-4 md:px-6`). Tidak ada blok menonjol ke satu sisi.
5. **Hover menjawab pointer.** Kartu link terangkat 2px, tombol menekan saat
   diklik, underline menggambar. Tanpa tilt, carousel, atau tab berwaktu.
6. **Ikon jujur.** Hanya Lucide `lucide-react`, warna flat mengikuti teks.
   Tidak ada ikon gambar sendiri.

## 2. Token (milik app, bukan landing)

Token app tinggal di `webapp/app/globals.css` (`@theme` + `[data-theme]`).
Landing menimpa lewat scope `.landing-variant` dan dikunci radius 0 di sana.

| Nama | Terang | Gelap | Peran |
|---|---|---|---|
| Ground | `#F4EFE3` | `#0C0A08` | Latar halaman |
| Surface | `#FFFFFF` | `#14110D` | Kartu, panel |
| Raised | `#EAE2D2` | `#1C1712` | Hover, track |
| Border / Rule | `#DED2BC` / `#ECE4D2` | `#2C241B` / `#171310` | Garis netral |
| Ink | `#141210` | `#F5F1E8` | Teks utama |
| Muted | `#5F6368` | `#B0A696` | Teks sekunder (≥4.5:1) |
| Faint | `#8A8478` | `#8A8073` | Meta kecil |
| Accent | `#C07A24` | `#C07A24` | Satu-satunya aksen |
| Accent tint | `#F1E3C9` | `#221A10` | Latar hover/baris aktif |
| Primary | `#141210` (teks ground) | `#F5F1E8` (teks ground) | Tombol utama |

Aturan pakai: flat + border 1px + satu tingkat tone. Tanpa gradien, tanpa
glassmorphism, tanpa glow. Bayangan hanya satu: bayangan kartu lembut
(`0 1px 2px rgb(0 0 0 / 0.06)`), bukan bayangan tombol.

## 3. Tipografi

- UI + judul: **Montserrat** (`--font-display`), 400/500/600/700/800.
- Angka/telemetri/meta: **IBM Plex Mono** (`--font-mono2`) + `tabular-nums`.
- Jost dilarang di app (milik landing saja).
- Skala judul app: halaman 28px bold tight, seksi 20px semibold, kartu 17px
  semibold. Body 15-16px, meta 12-13px mono.

## 4. Radius — 8px kecil (bukan kotak, bukan lg)

Keputusan: `--radius: 8px` untuk seluruh app.

- Kartu, panel, input, select, tombol, badge status, baris link: 8px.
- Turunan shadcn mengikuti skala: `sm 5px / md 6px / lg 8px / xl 11px`.
- Pengecualian fungsional: dot status tetap lingkaran penuh.
- Landing dikunci `0` di `.landing-variant` agar tidak ikut membulat.
- Dilarang `rounded-lg / rounded-xl / rounded-2xl` mentah di app — selalu
  lewat `var(--radius)`.

## 5. shadcn — primitif perilaku, gaya milik app

Primitif dipakai sebagai perilaku + aksesibilitas (focus, keyboard, ARIA),
bukan sebagai tampilan default shadcn.

| Primitif | Gaya app |
|---|---|
| Button (default/accent/outline/ghost/destructive; default/sm/lg/icon) | radius 8px, flat, tanpa shadow. Hover: opacity/border. Active: tekan 1px (`translateY(1px)`). Focus: outline aksen 2px |
| Input / select | radius 8px, `surface`, border `control`, hover border `muted`, focus border `accent` + outline 2px |
| Card (baru, `components/ui/card.tsx`) | radius 8px, `surface`, border 1px, padding 20px, shadow lembut 1 lapis. Varian hover-lift hanya untuk kartu link (+2px, shadow naik) |
| Badge | radius 8px untuk tag; dot + label untuk status live/stale |
| WidgetCard | Card + header mono 13px + isi. Tinggi min 120px |

Yang tidak diambil: chart bawaan, carousel, gaya bayangan/gradien/radius
besar bawaan shadcn.

## 6. Pola layar

- **PageHead:** judul 28px + desc muted 15px, margin bawah 20px. Sama di semua tab.
- **Form tambah (board/device):** kartu `surface` 8px, label mono 12px, input
  + tombol sejajar di `sm+`, tombol `self-end`.
- **Daftar (board/device):** kartu per baris di dalam satu Card induk, pemisah
  `rule` 1px (bukan kartu per baris). Hover baris = tint aksen. Hapus dua tahap
  ("Yakin?") + ikon `Trash2`.
- **Kanvas board:** grid 12 kolom desktop, full-row di HP (`.board-grid` tetap).
  Widget = `WidgetCard`. Nama device mono 12px di bawah widget.
- **Auth (`/login`):** kartu tengah 560px, radius 8px, padding 32px. Tab
  Masuk/Daftar sebagai segmented control (bukan dua tombol outline lepas).
  Error selalu teks + `role="alert"`, bukan warna saja.

## 7. Gerak

- Transisi warna 150ms. Hover-lift kartu 2px / 200ms. Tekan tombol 1px.
- Reveal sekali jalan `translateY(12px) + opacity`, stagger ≤ 60ms (lebih kalem
  dari landing 18px/90ms).
- `prefers-reduced-motion`: semua reveal + lift mati, konten langsung tampil.

## 8. Aksesibilitas (non-negosiasi)

- Kontras teks ≥ 4.5:1 (besar ≥ 3:1). Pasangan tembaga sudah terukur di DESIGN §10.
- Target sentuh ≥ 44px. Focus visible aksen 2px di semua kontrol, kedua tema.
- Form berlabel, error teks. Ikon dekoratif `aria-hidden`.

## 9. Anti-konflik (mengikat)

1. Token hanya di `globals.css` + kunci landing di `variant.css`.
2. Komponen `components/ui/`: utility Tailwind + token, varian via `cva`.
   Dilarang `!important`.
3. App (`components/`, `app/(shell)/`, `app/login/`): komposisi primitif,
   radius selalu `var(--radius)`, tidak ada angka radius mentah.
4. Landing (`app/page.tsx`, `app/landing/`, `.landing-variant`): radius selalu
   `0` inline, tidak boleh mewarisi 8px app.

## 10. Gate penerimaan

- [ ] `DESIGN.md` tidak diubah; landing tetap kotak 0 di 1440/768/390.
- [ ] Seluruh shell + login radius 8px, tidak ada `rounded-lg` mentah.
- [ ] Satu gaya kartu, satu pasang tombol, hover menjawab pointer.
- [ ] Kontras + keyboard + reduced-motion lolos seperti §8.
