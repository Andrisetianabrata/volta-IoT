# Volta — Logo Guidelines (compact)

> Untuk non-desainer. Lebih banyak "lakukan" daripada "jangan".

## 1. Logo
- **Ide**: Dua kotak — solid dan ring — adalah HIGH dan LOW, 1 dan 0. Otomasi tanpa ambiguitas.
- **Versi**: primer (horizontal) · stacked (vertikal) · simbol saja · wordmark saja
- **File**: `kit/*.svg` master vektor · `kit/*-1024.png`, `*-1600.png` untuk layar · `kit/favicon.ico`, `icon-*.png`, `site.webmanifest` untuk web

## 2. Ruang aman
Jaga zona kosong **1 × tinggi satu kotak simbol** (37,5% tinggi simbol) di semua sisi logo. Zona ikut membesar-mengecil bersama logo — jangan pakai jarak tetap.

## 3. Ukuran minimum
| Versi | Layar | Cetak |
|---|---|---|
| Horizontal | lebar 96 px | lebar 25 mm |
| Simbol | 16 px (pakai file `volta-symbol-favicon.svg` / `favicon-*.png`) | 6 mm |
| Stacked | lebar 72 px | lebar 20 mm |

## 4. Warna
| Nama | HEX | RGB | CMYK |
|---|---|---|---|---|
| Volta Ink | #111111 | 17 17 17 | 0 0 0 93 |
| Volta Copper | #C07A24 | 192 122 36 | 0 36 81 25 |
| Volta Steel | #7C8288 | 124 130 136 | 9 4 0 47 |
| Volta Paper | #F5F3EE | 245 243 238 | 0 1 3 4 |

**Pasangan yang disetujui**: Ink di atas putih/paper · putih di atas Ink · putih di atas Copper · Copper di atas putih (simbol/aksen). Di atas foto, pakai versi putih/hitam di area tenang.

## 5. Tipografi
- Wordmark: Montserrat Black (lisensi OFL) + kotak terminal — master sudah berupa outline vektor, tidak perlu install font. File font tersimpan di `kit/fonts/Montserrat-Black.ttf`.
- Headline/body pendamping: Montserrat / IBM Plex Sans (OFL) · fallback web: system-ui.
- Monospace untuk kode/log: IBM Plex Mono.

## 6. Jangan
Jangan melar/menyempitkan · jangan mewarnai di luar palet · jangan memutar · jangan menambah bayangan, outline, gradien, atau efek · jangan menyusun ulang/mengubah ukuran bagian lockup · jangan menaruh di latar ramai tanpa wadah · jangan mengetik ulang wordmark.

## 7. Kontak & master
Master: folder `kit/` (file `volta-*.svg`). Web: `kit/site.webmanifest` + `kit/head-snippet.html`. Pertanyaan pemakaian: tim Volta.
