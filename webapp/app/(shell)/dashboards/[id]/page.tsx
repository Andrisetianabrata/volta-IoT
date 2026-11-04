import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { DashboardCanvas } from "@/components/dashboard-canvas";
import { WidgetAddForm } from "@/components/widget-add-form";

export default async function DashboardCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [boards, widgets, devs] = await Promise.all([api.dashboards(), api.widgets(id), api.devices()]);
  const board = boards.ok ? boards.data.find((d) => d.id === id) : undefined;
  if (!boards.ok || !board) notFound();
  if (!widgets.ok) {
    return (
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--color-text)]">{board.name}</h1>
        <p className="mt-3 text-[15px] text-[var(--color-muted)]">Widget tidak bisa dimuat: {widgets.error.message}</p>
      </div>
    );
  }
  const deviceCount = new Set(
    widgets.data.map((w) => {
      try {
        return (JSON.parse(w.config || "{}") as { device?: string }).device;
      } catch {
        return undefined;
      }
    })
  );
  deviceCount.delete(undefined);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--color-text)]">{board.name}</h1>
          <p className="tnum mt-1 font-mono2 text-[12px] text-[var(--color-muted)]">
            {widgets.data.length} widget · {deviceCount.size} device
          </p>
        </div>
        <a
          href={`/dashboards/${encodeURIComponent(id)}`}
          className="inline-flex min-h-[44px] items-center border border-[var(--color-border)] px-4 text-[15px] font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
        >
          Muat ulang
        </a>
      </div>
      <DashboardCanvas widgets={widgets.data} devices={devs.ok ? devs.data : []} />
      <section aria-label="Tambah widget" className="mt-8">
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">Tambah widget</h2>
        <p className="mt-1 text-[15px] text-[var(--color-muted)]">
          Pilih jenis, device pemilik pin, dan pin. Posisi tersusun otomatis; geser manual menyusul di W12.
        </p>
        <div className="mt-4">
          <WidgetAddForm dashboardId={id} devices={devs.ok ? devs.data : []} />
        </div>
      </section>
    </div>
  );
}
