import { HeroFragment } from "../../components/hero-fragment";
import { CommandDemo } from "../../components/command-demo";
import { Reveal } from "../../components/reveal";
import { SignalCanvas } from "../../components/signal-canvas";
import { PinTicker } from "../../components/pin-ticker";
import { PinChart } from "../../components/pin-chart";
import { niceCeil } from "../../lib/chart-scale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

export default function LandingPage() {
  return (
    <>
      <Reveal />
      {/* HERO: fragmen di atas panggung */}
      <section id="atas" aria-labelledby="judul" className="relative overflow-hidden">
        <SignalCanvas />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="reveal max-w-xl self-end">
            <Badge dot={true}>server IoT lokal . ESP32</Badge>
            <h1 id="judul" className="mt-5 text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Server IoT lokal untuk ESP32<span aria-hidden="true" style={{ color: "var(--color-accent)" }}>.</span>
            </h1>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-[var(--color-muted)]">
              VOLTA merekam pin, menayangkan nilainya live, dan membiarkan kamu mengirim perintah dari dashboard
              yang kamu susun sendiri. Tanpa cloud, tanpa antrean pihak ketiga.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg">
                <a href="#install">Install</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer">Lihat GitHub</a>
              </Button>
            </div>
            <dl className="mt-10 flex gap-8 font-mono2 text-[13px]">
              <div>
                <dt className="text-[var(--color-faint)]">protokol</dt>
                <dd className="tnum mt-1 text-[var(--color-text)]">REST + WS</dd>
              </div>
              <div>
                <dt className="text-[var(--color-faint)]">port bawaan</dt>
                <dd className="tnum mt-1 text-[var(--color-text)]">9443</dd>
              </div>
              <div>
                <dt className="text-[var(--color-faint)]">grafik</dt>
                <dd className="tnum mt-1 text-[var(--color-text)]">1H / 24H</dd>
              </div>
            </dl>
          </div>
          <div className="reveal" data-delay="90">
            <div className="border border-[var(--color-border)] bg-[var(--color-raised)] p-3 sm:p-4" style={{ borderRadius: "var(--radius)" }}>
              <HeroFragment chart={{ line: "#C07A24" }} />
            </div>
          </div>
        </div>
      </section>

      <PinTicker />

      {/* FITUR: sel fragmen berjenjang */}
      <section id="fitur" aria-labelledby="fitur-judul" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <h2 id="fitur-judul" className="reveal max-w-[16ch] text-3xl font-bold tracking-tight sm:text-5xl">
          Panel yang jujur soal status.
        </h2>
        <p className="reveal mt-5 max-w-[54ch] text-[17px] leading-relaxed text-[var(--color-muted)]">
          Tiga potongan app yang sebenarnya: daftar pin live, grafik history, dan kartu provisioning. Semua angka
          di bawah ini contoh tampilan.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <div data-ui className="reveal border border-[var(--color-border)] bg-[var(--color-surface)] p-5" style={{ borderRadius: "var(--radius)" }}>
            <div className="flex items-center justify-between">
              <p className="font-mono2 text-[13px] text-[var(--color-muted)]">device kebun-01</p>
              <Badge dot={true}>online</Badge>
            </div>
            <ul className="tnum mt-4 space-y-0 font-mono2 text-[15px]">
              {[["V0", "1820", "2 dtk lalu"], ["V1", "1", "2 dtk lalu"], ["V2", "640", "5 dtk lalu"], ["V3", "basi 40 dtk", "tandai basi"]].map(([pin, val, age]) => (
                <li key={pin} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] py-3">{/* taste-skill-ignore: pin table rows inside data-ui fragment */}
                  <span>{pin}</span>
                  <span>{val}</span>
                  <span className="text-[13px] text-[var(--color-muted)]">{age}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] font-semibold">Pin live</p>
            <p className="mt-1 text-[15px] text-[var(--color-muted)]">Satu koneksi WebSocket per device, reconnect otomatis.</p>
          </div>
          <div data-ui className="reveal border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:mt-12" style={{ borderRadius: "var(--radius)" }} data-delay="60">
            <div className="flex items-center justify-between">
              <p className="font-mono2 text-[13px] text-[var(--color-muted)]">V0 . 7 hari</p>
              <Badge variant="neutral">maks {niceCeil(1860)}</Badge>
            </div>
            <div className="mt-4">
              <PinChart data={week} label="Contoh grafik mingguan pin V0" line="#C07A24" />
            </div>
            <p className="mt-4 text-[15px] font-semibold">Grafik history</p>
            <p className="mt-1 text-[15px] text-[var(--color-muted)]">Satu garis tembaga, tick bulat, rentang 1 jam dan 24 jam.</p>
          </div>
          <div data-ui className="reveal border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:mt-24" style={{ borderRadius: "var(--radius)" }} data-delay="120">
            <p className="font-mono2 text-[13px] text-[var(--color-muted)]">provision . sekali tampil</p>
            <p className="tnum mt-4 break-all font-mono2 text-[15px]">id 9f3a…c21e</p>
            <p className="tnum mt-2 break-all font-mono2 text-[15px] text-[var(--color-muted)]">token •••••••• (disalin)</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">Salin ID</Button>
              <Button size="sm">Flash</Button>
            </div>
            <p className="mt-4 text-[15px] font-semibold">Provisioning</p>
            <p className="mt-1 text-[15px] text-[var(--color-muted)]">ID plus token sekali tampil, salin lalu flash ke firmware.</p>
          </div>
        </div>
      </section>

      {/* SHOWCASE: ketik perintah */}
      <section aria-labelledby="cmd-judul" className="bg-[var(--color-surface)]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2">
          <div className="reveal self-center">
            <h2 id="cmd-judul" className="max-w-[14ch] text-3xl font-bold tracking-tight sm:text-5xl">
              Ketik perintah, lihat jawabannya.
            </h2>
            <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-[var(--color-muted)]">
              Kolom ini meniru kolom perintah di app. Format yang dikenali hanya pola PIN sama dengan angka, dan
              setiap kirim dijawab teks, bukan sekadar warna.
            </p>
          </div>
          <div className="reveal" data-delay="90">
            <CommandDemo />
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara" aria-labelledby="cara-judul" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <h2 id="cara-judul" className="reveal text-3xl font-bold tracking-tight sm:text-5xl">Dari dus sampai live.</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            ["Daftarkan device", "Buat entri di Provision. Catat ID 8 karakter dan token sekali tampil."],
            ["Flash firmware", "Tempel token ke konfigurasi ESP32, lalu flash seperti biasa."],
            ["Pantau dan tulis", "Pilih device di Monitor. Nilai mengalir live, perintah terkirim via REST."],
          ].map(([t, d], i) => (
            <li key={t} className="reveal border-t-2 pt-5" style={{ borderColor: "var(--color-accent)" }} data-delay={String(i * 60)}>
              <p className="text-[13px] text-[var(--color-muted)]">Langkah {i + 1}</p>
              <p className="mt-2 text-[24px] font-semibold">{t}</p>
              <p className="mt-2 text-[16px] text-[var(--color-muted)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-judul" className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="reveal lg:col-span-4">
            <h2 id="faq-judul" className="text-3xl font-bold tracking-tight sm:text-5xl">Jawaban singkat.</h2>
            <p className="mt-5 text-[16px] text-[var(--color-muted)]">Pertanyaan yang memang ditanyakan soal server lokal, token, dan grafik.</p>
          </div>
          <Accordion type="single" collapsible defaultValue="butuh-internet" className="reveal lg:col-span-8">
            {faqs.map((f) => (
              <AccordionItem key={f.v} value={f.v}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* INSTALL */}
      <section id="install" aria-labelledby="install-judul" className="bg-[var(--color-surface)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <Badge dot={true}>sumber terbuka . MIT</Badge>
          <h2 id="install-judul" className="reveal mt-5 max-w-[20ch] text-3xl font-bold tracking-tight sm:text-5xl">
            Install dalam hitungan menit.
          </h2>
          <p className="reveal mt-4 max-w-[52ch] text-[16px] text-[var(--color-muted)]">
            Satu biner berisi broker MQTT, HTTP, mailer, dan storage. Tanpa layanan terpisah untuk dijalankan.
          </p>
          <CodeBlock
            lang="bash"
            label="bash"
            className="reveal mt-8"
            code={`git clone https://github.com/Andrisetianabrata/volta-IoT.git
cd volta-IoT
cargo build --release
./target/release/volta --data-folder ./data`}
          />
          <div className="reveal mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="min-h-[44px]">
              <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer">Kloning repo</a>
            </Button>
            <Button asChild className="min-h-[44px] bg-[var(--color-primary)] text-[var(--primary-foreground)] hover:bg-[var(--color-primary)] hover:opacity-85">
              <a href="https://github.com/Andrisetianabrata/volta-IoT/archive/refs/heads/main.zip">Unduh ZIP</a>
            </Button>
          </div>
          <p className="reveal tnum mt-5 font-mono2 text-[13px] text-[var(--color-muted)]">
            Port bawaan: 1883 MQTT lokal, 8883 MQTT TLS, 9443 HTTPS app.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-2 md:grid-cols-12">
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:col-span-5">
            <p className="text-[22px] font-bold leading-snug">Server IoT lokal yang jujur soal status.</p>
            <p className="mt-8 text-[13px] text-[var(--color-muted)]">VOLTA. Precision in Every Pulse.</p>
          </div>
          <nav aria-label="Tautan footer" className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:col-span-3">
            <ul className="space-y-3 text-[16px]">
              <li><a href="#fitur" className="hover:underline underline-offset-4">Fitur</a></li>
              <li><a href="#cara" className="hover:underline underline-offset-4">Cara kerja</a></li>
              <li><a href="#faq" className="hover:underline underline-offset-4">FAQ</a></li>
              <li><a href="#install" className="hover:underline underline-offset-4">Install</a></li>
              <li><a href="#atas" className="hover:underline underline-offset-4">Kembali ke atas</a></li>
            </ul>
          </nav>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:col-span-2">
            <p className="text-[13px] text-[var(--color-muted)]">server</p>
            <p className="tnum mt-2 font-mono2 text-[15px]">localhost:9443</p>
            <p className="mt-2 text-[13px] text-[var(--color-muted)]">REST plus WS lokal</p>
          </div>
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:col-span-2">
            <p className="text-[13px] text-[var(--color-muted)]">kode</p>
            <p className="mt-2"><a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer" className="text-[18px] font-medium hover:underline underline-offset-4">GitHub</a></p>
          </div>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-12">
          <div className="flex items-center border border-[var(--color-border)] bg-[var(--color-primary)] p-8 md:col-span-9">
            <img src="/volta-horizontal.svg" alt="VOLTA" width={280} height={64} className="hidden h-auto w-full max-w-[280px] dark:block" />
            <img src="/volta-horizontal-reversed.svg" alt="" aria-hidden="true" width={280} height={64} className="h-auto w-full max-w-[280px] dark:hidden" />
          </div>
          <a href="https://github.com/Andrisetianabrata/volta-IoT" target="_blank" rel="noreferrer" className="flex min-h-[140px] flex-col justify-between border p-5 text-[var(--accent-foreground)] transition-opacity hover:opacity-90" style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)", borderRadius: "var(--radius)" }}>
            <span className="text-[24px] font-bold leading-tight">Kloning repo</span>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="self-end">
              <path d="M6 22L22 6M22 6H9M22 6v13" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
            </svg>
          </a>
        </div>
      </footer>
    </>
  );
}
