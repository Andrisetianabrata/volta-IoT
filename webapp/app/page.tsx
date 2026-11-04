import { HeroFragment } from "../components/hero-fragment";
import { CommandDemo } from "../components/command-demo";
import { Reveal } from "../components/reveal";
import { LandingBitfield } from "../components/landing-bitfield";
import { PinTicker } from "../components/pin-ticker";
import { PinChart } from "../components/pin-chart";
import { niceCeil } from "../lib/chart-scale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/* Varian referensi /landing: konten sama dengan halaman utama, kulit bebas (di luar DESIGN.md).
   Arah: one-motif (seed 1775104155). Motif = kotak Bit, dijalankan di semua skala. */

function BitBand({ n = 28 }: { n?: number }) {
  return (
    <div className="bit-band" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className={i % 2 === 0 ? "on" : "off"} />
      ))}
    </div>
  );
}

const faqs = [
  {
    v: "butuh-internet",
    q: "Apakah VOLTA butuh koneksi internet?",
    a: "Tidak. Server berjalan di mesin lokal dan diakses via jaringan setempat. Webapp memakai proxy BFF agar browser tidak perlu CORS.",
  },
  {
    v: "daftar-esp32",
    q: "Bagaimana ESP32 pertama didaftarkan?",
    a: "Buat device di halaman Provision untuk mendapat ID dan token sekali tampil. Salin token itu ke firmware, lalu flash seperti biasa.",
  },
  {
    v: "token-ws",
    q: "Di mana token WebSocket disimpan?",
    a: "Di cookie httpOnly lewat proxy BFF. Klien mengambil token sekali pakai hanya saat membuka stream, tidak menyimpan di localStorage.",
  },
  {
    v: "retensi",
    q: "Berapa rentang grafik yang tersedia?",
    a: "Saat ini 1 jam dan 24 jam. Rentang 7 hari masih pertanyaan terbuka dan belum dijanjikan.",
  },
  {
    v: "server-mati",
    q: "Apa yang terlihat bila server mati?",
    a: "Strip status menampilkan kartu unreachable yang eksplisit. Tidak ada angka basi yang disamarkan sebagai data.",
  },
  {
    v: "sandbox",
    q: "Bisakah widget HTML membaca cookie induk?",
    a: "Tidak. Widget berjalan di iframe sandbox tanpa allow-same-origin, dan hanya bertukar pesan pin dan perintah.",
  },
];

const week = [
  { t: "Sen", v: 1710 }, { t: "Sel", v: 1760 }, { t: "Rab", v: 1690 }, { t: "Kam", v: 1820 },
  { t: "Jum", v: 1790 }, { t: "Sab", v: 1860 }, { t: "Min", v: 1830 },
];

export default function LandingVariantPage() {
  return (
    <div className="landing-variant">
      <Reveal />
      {/* HERO: kartu cetak + ruang motif 3D */}
      <section id="atas" aria-labelledby="judul" className="mx-auto grid w-full max-w-7xl gap-4 px-4 pt-4 sm:px-4 lg:grid-cols-2">
        <div className="reveal order-2 min-w-0 border border-[var(--v-border)] bg-[var(--v-surface)] lg:order-1" style={{ borderRadius: 0 }}>
          <BitBand />
          <div className="px-6 pb-8 pt-8 sm:px-10">
            <div className="flex items-center gap-3">
              <img src="/volta-symbol-white.svg" alt="" aria-hidden="true" width={40} height={40} className="hidden h-10 w-10 dark:block" />
              <img src="/volta-symbol.svg" alt="" aria-hidden="true" width={40} height={40} className="h-10 w-10 dark:hidden" />
              <p className="font-display-em text-[28px]" aria-label="VOLTA">VOLTA.</p>
            </div>
            <h1 id="judul" className="font-display-em mt-8 text-[36px] md:text-[40px] xl:text-[52px]">
              Server IoT lokal untuk ESP32.
            </h1>
            <p className="mt-6 max-w-[36ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
              VOLTA merekam pin, menayangkan nilainya live, dan membiarkan kamu mengirim perintah dari dashboard
              yang kamu susun sendiri. Tanpa cloud, tanpa antrean pihak ketiga.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg" style={{ borderRadius: 0 }}>
                <a href="#install">Install</a>
              </Button>
              <Button asChild variant="outline" size="lg" style={{ borderRadius: 0 }}>
                <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer">Lihat GitHub</a>
              </Button>
            </div>
            <div className="mt-10 flex gap-8 text-[15px] text-[var(--v-muted)]">
              <a href="#fitur" className="hover:underline underline-offset-4">Fitur</a>
              <a href="#cara" className="hover:underline underline-offset-4">Cara kerja</a>
              <a href="#faq" className="hover:underline underline-offset-4">FAQ</a>
            </div>
          </div>
        </div>
        <div className="reveal relative order-1 min-w-0 h-[48svh] overflow-hidden border border-[var(--v-border)] lg:order-2 lg:sticky lg:top-4 lg:h-[calc(100svh-2rem)]" style={{ borderRadius: 0 }} data-delay="90">
          <LandingBitfield />
        </div>
      </section>

      <div className="mt-4">
        <PinTicker />
      </div>

      {/* FITUR: kalimat + fragmen bergantian */}
      <section id="fitur" aria-labelledby="fitur-judul" className="mx-auto w-full max-w-7xl px-4 py-24 sm:py-32">
        <div className="grid items-center gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="reveal">
            <h2 id="fitur-judul" className="font-display-em max-w-[12ch] text-[clamp(32px,4vw,56px)]">
              Panel yang jujur soal status.
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
              Daftar pin live lewat satu WebSocket per device. Offline ditandai basi, bukan angka basi.
            </p>
          </div>
          <div data-ui className="reveal border border-[var(--v-border)] bg-[var(--v-surface)] p-5" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[var(--v-muted)]">device kebun-01 . demo</p>
              <Badge dot={true}>online</Badge>
            </div>
            <ul className="tnum mt-4 font-display-em text-[15px]" style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
              {[["V0", "1820", "2 dtk lalu"], ["V1", "1", "2 dtk lalu"], ["V2", "640", "5 dtk lalu"], ["V3", "basi 40 dtk", "tandai basi"]].map(([pin, val, age]) => (
                <li key={pin} className="flex items-baseline justify-between gap-3 border-b border-[var(--v-rule)] py-3">{/* taste-skill-ignore: pin table rows inside data-ui fragment */}
                  <span>{pin}</span>
                  <span>{val}</span>
                  <span className="text-[13px] text-[var(--v-muted)]" style={{ fontFamily: "var(--font-variant)" }}>{age}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-20 grid items-center gap-10 lg:grid-cols-2">
          <div data-ui className="reveal order-2 border border-[var(--v-border)] bg-[var(--v-surface)] p-5 lg:order-1" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[var(--v-muted)]">V0 . 7 hari . demo</p>
              <Badge variant="neutral">maks {niceCeil(1860)}</Badge>
            </div>
            <div className="mt-4">
              <PinChart data={week} label="Contoh grafik mingguan pin V0" />
            </div>
          </div>
          <div className="reveal order-1 lg:order-2">
            <h3 className="font-display-em max-w-[14ch] text-[clamp(28px,3.4vw,44px)]">Grafik satu garis kobalt.</h3>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
              Tick bulat di atas maksimum, rentang 1 jam dan 24 jam. Hover menampilkan nilai dan waktu.
            </p>
          </div>
        </div>
      </section>

      {/* SHOWCASE: pelat kotak */}
      <section aria-labelledby="cmd-judul" className="bg-[var(--v-surface)]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-24 sm:py-32 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="reveal self-center">
            <h2 id="cmd-judul" className="font-display-em max-w-[12ch] text-[clamp(32px,4vw,56px)]">
              Ketik perintah, lihat jawabannya.
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
              Kolom ini meniru kolom perintah di app. Format yang dikenali hanya pola PIN sama dengan angka.
            </p>
          </div>
          <div className="reveal border border-[var(--v-border)] bg-[var(--v-bg)] p-6" style={{ borderRadius: 0 }} data-delay="90">
            <HeroFragment />
          </div>
        </div>
      </section>

      {/* CARA KERJA: satu kartu tiga bidang */}
      <section id="cara" aria-labelledby="cara-judul" className="mx-auto w-full max-w-7xl px-4 py-24 sm:py-32">
        <h2 id="cara-judul" className="reveal font-display-em max-w-[14ch] text-[clamp(32px,4vw,56px)]">Dari dus sampai live.</h2>
        <ol className="reveal mt-12 grid gap-px border border-[var(--v-border)] bg-[var(--v-border)] md:grid-cols-3" style={{ borderRadius: 0 }}>
          {[
            ["Langkah 1", "Daftarkan device", "Buat entri di Provision. Catat ID 8 karakter dan token sekali tampil."],
            ["Langkah 2", "Flash firmware", "Tempel token ke konfigurasi ESP32, lalu flash seperti biasa."],
            ["Langkah 3", "Pantau dan tulis", "Pilih device di Monitor. Nilai mengalir live, perintah terkirim via REST."],
          ].map(([k, t, d]) => (
            <li key={t} className="bg-[var(--v-bg)] p-6">
              <p className="text-[13px] text-[var(--v-muted)]">{k}</p>
              <p className="mt-2 text-[22px] font-bold">{t}</p>
              <p className="mt-2 text-[16px] leading-relaxed text-[var(--v-muted)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-judul" className="mx-auto w-full max-w-7xl px-4 pb-24 sm:pb-32">
        <h2 id="faq-judul" className="reveal font-display-em max-w-[12ch] text-[clamp(32px,4vw,56px)]">Jawaban singkat.</h2>
        <Accordion type="single" collapsible defaultValue="butuh-internet" className="reveal mt-12">
          {faqs.map((f) => (
            <AccordionItem key={f.v} value={f.v}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* INSTALL */}
      <section id="install" aria-labelledby="install-judul" className="mx-auto w-full max-w-7xl px-4 pb-24 sm:pb-32">
        <div className="reveal border border-[var(--v-border)] bg-[var(--v-surface)] p-8 sm:p-12" style={{ borderRadius: 0 }}>
          <h2 id="install-judul" className="font-display-em max-w-[18ch] text-[clamp(32px,4vw,56px)]">
            Install dalam hitungan menit.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
            Satu biner berisi broker MQTT, HTTP, mailer, dan storage. Tanpa layanan terpisah untuk dijalankan.
          </p>
          <CodeBlock
            lang="bash"
            label="bash"
            className="mt-8"
            style={{ borderRadius: 0 }}
            code={`git clone https://github.com/Andrisetianabrata/volta-IoT.git
cd volta-IoT
cargo build --release
./target/release/volta --data-folder ./data`}
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" style={{ borderRadius: 0 }}>
              <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer">Kloning repo</a>
            </Button>
            <Button asChild variant="accent" style={{ borderRadius: 0 }}>
              <a href="https://github.com/Andrisetianabrata/volta-IoT/archive/refs/heads/main.zip">Unduh ZIP</a>
            </Button>
          </div>
          <p className="tnum mt-5 text-[13px] text-[var(--v-muted)]" style={{ fontFamily: "var(--font-variant)" }}>
            Port bawaan: 1883 MQTT lokal, 8883 MQTT TLS, 9443 HTTPS app.
          </p>
        </div>
      </section>

      {/* FOOTER: marka besar */}
      <footer className="mx-auto w-full max-w-7xl px-4 pb-8">
        <BitBand n={48} />
        <p className="font-display-em mt-8 text-[clamp(64px,14vw,220px)] leading-none" aria-label="VOLTA">VOLTA.</p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[15px]">
          <p className="text-[var(--v-muted)]">Precision in Every Pulse. Sumber terbuka, lisensi MIT.</p>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-5">
            <a href="#fitur" className="hover:underline underline-offset-4">Fitur</a>
            <a href="#cara" className="hover:underline underline-offset-4">Cara kerja</a>
            <a href="#faq" className="hover:underline underline-offset-4">FAQ</a>
            <a href="#install" className="hover:underline underline-offset-4">Install</a>
            <a href="#atas" className="hover:underline underline-offset-4">Kembali ke atas</a>
            <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer" className="hover:underline underline-offset-4">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
