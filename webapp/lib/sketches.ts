import { promises as fs } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";

export type Sketch = {
  num: string;
  slug: string;
  title: string;
  desc: string;
  lines: number;
  code: string;
  html: string;
};

const DESC: Record<string, string> = {
  "01": "LED kedip tanpa delay.",
  "02": "Empat tugas jalan bergantian.",
  "03": "Tombol dengan anti-pentalan.",
  "04": "Device penuh: WiFi, MQTT, perintah.",
  "05": "Rata-rata sensor ke CSV.",
  "06": "Kirim nilai pin ke server.",
  "07": "Terima perintah dari server.",
  "08": "Saklar relay yang aman.",
  "09": "LED redup-terang halus.",
  "10": "Terbit hanya saat berubah.",
  "11": "Log berlevel dan dibatasi.",
  "12": "Periksa pin aman sebelum pakai.",
  "13": "Tiga filter dibandingkan.",
  "14": "MQTT tanpa perantara device.",
};

function prettify(dir: string): { num: string; title: string } {
  const num = dir.slice(0, 2);
  const title = dir
    .slice(3)
    .split("_")
    .map((w) => (w === "MQTT" || w === "CSV" || w === "LED" || w === "PWM" || w === "WiFi" ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .replace("Wifi", "WiFi");
  return { num, title };
}

/* Daftar sketch firmware untuk galeri laptop 3D. Baca saat build/SSR. */
export async function getSketches(): Promise<Sketch[]> {
  const dir = path.join(process.cwd(), "..", "firmware", "lib", "VoltaESP32", "examples");
  const entries = (await fs.readdir(dir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const out: Sketch[] = [];
  for (const name of entries) {
    const files = await fs.readdir(path.join(dir, name));
    const ino = files.find((f) => f.endsWith(".ino"));
    if (!ino) continue;
    const code = (await fs.readFile(path.join(dir, name, ino), "utf8")).replace(/\s+$/, "");
    const { num, title } = prettify(name);
    // Shiki memisah baris dengan node teks newline; karena CSS membuat
    // .line menjadi block (untuk hanging indent), newline itu dibuang agar
    // tidak menjadi baris kosong ganda. Baris kosong akhir dibuang dulu
    // sebelum pemisah lain agar polanya masih cocok.
    const html = (await codeToHtml(code, {
      lang: "cpp",
      themes: { light: "github-light", dark: "github-dark" },
    }))
      .replace(/\n<span class="line"><\/span><\/code>/g, "</code>")
      .replace(/<\/span>\n<span class="line">/g, '</span><span class="line">');
    out.push({
      num,
      slug: ino.replace(/\.ino$/, ""),
      title,
      desc: DESC[num] ?? "Contoh firmware.",
      lines: code.split("\n").length,
      code,
      html,
    });
  }
  return out;
}
