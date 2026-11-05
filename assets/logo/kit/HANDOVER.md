# Volta Bit Pair — Handover

## Keputusan
Simbol: dua kotak 96 px (solid + ring), celah 24, lubang ring 48. Tanpa huruf, tanpa diagonal.
Wordmark: Montserrat Black (OFL) hasil shaping HarfBuzz + tracking, di-convert ke outline vektor permanen, plus bit-stop 40 px. File font: `kit/fonts/Montserrat-Black.ttf` (instansiasi wght=900 dari variable font resmi).

## Verifikasi yang sudah dilakukan
- `svg_audit`: simbol 100/100 dan 99/100 (satu INFO: markah landscape di kanvas persegi — disengaja untuk konteks app-icon).
- Peringatan sudut pada wordmark (diagonal V/A ~72°) adalah pengecualian tipografi yang sah — sudah dicek visual di lockup, terbaca bersih.
- Render 512/32/16 px: simbol utuh di semua ukuran; versi `small` (lubang 52) untuk favicon.
- `preview_sheet`: ukuran, latar, satu warna, blur, mirror — lolos.
- Papan presentasi: `renders/volta-board.html` + `renders/slides/`.

## File kanonis (kit/)
- `volta-symbol.svg` (Ink) · `volta-symbol-small.svg` (favicon) · `volta-symbol-white.svg` · `volta-symbol-copper.svg`
- `volta-horizontal.svg` (primer) · `volta-horizontal-reversed.svg` · `volta-stacked.svg` (+reversed) · `volta-wordmark.svg`
- Web: `favicon.ico`, `favicon-*.png`, `icon-*.png`, `site.webmanifest`, `head-snippet.html`

## Terbuka
1. Penelusuran merek (trademark + reverse image search) sebelum produksi massal — belum dilakukan.
2. Palet memakai Copper #C07A24 yang lolos untuk grafis besar; untuk teks kecil di web tetap pakai Ink.
3. Varian `square`/`app-icon` bawaan generator; untuk app icon produksi disarankan full-bleed `volta-symbol.svg` (masking ikut OS).
