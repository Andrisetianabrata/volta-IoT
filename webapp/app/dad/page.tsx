import { DadCanvas } from "@/components/canvas/dad-canvas";

export const metadata = {
  title: "Drag & Drop — VOLTA.",
  description: "Contoh kanvas drag-and-drop widget ala Blynk + widget HTML kustom",
};

export default function DadPage() {
  return (
    <main className="min-h-screen bg-[#e9e9e7] text-foreground dark:bg-[#0a0a0b]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          VOLTA. · Kanvas drag &amp; drop
        </p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
          Dad canvas
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Contoh mekanisme Blynk: widget peta Leaflet, gauge, tombol, LED,
          dan HTML kustom di atas grid — seret dan ubah ukurannya. Contoh
          lokal dengan nilai simulasi, bukan data device.
        </p>
        <div className="mt-8">
          <DadCanvas />
        </div>
      </div>
    </main>
  );
}
