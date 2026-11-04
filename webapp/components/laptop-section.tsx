import { getSketches } from "../lib/sketches";
import { LaptopGallery } from "./laptop-gallery";

/* Seksi sketch firmware: laptop 3D + daftar sketch mengikuti scroll. */
export async function LaptopSection() {
  const sketches = await getSketches();
  if (sketches.length === 0) return null;
  return (
    <section id="sketch" aria-labelledby="sketch-judul" className="mx-auto w-full max-w-7xl px-4 py-24 sm:py-32">
      <h2 id="sketch-judul" className="reveal font-display-em max-w-[14ch] text-[clamp(32px,4vw,56px)]">
        Semua sketch, geser untuk melihat.
      </h2>
      <p className="reveal mt-6 max-w-[44ch] text-[17px] leading-relaxed text-[var(--v-muted)]">
        Empat belas sketch firmware, dari kedip LED sampai MQTT mentah. Layar laptop mengikuti bagian yang sedang
        dibaca.
      </p>
      <LaptopGallery sketches={sketches} />
    </section>
  );
}
