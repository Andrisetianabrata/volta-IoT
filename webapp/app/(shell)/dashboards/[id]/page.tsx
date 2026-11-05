import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-text)]">{board.name}</h1>
        <Card className="mt-4">
        <p className="text-[17px] font-semibold text-[var(--color-text)]">Widget tidak bisa dimuat.</p>
        <p className="mt-2 text-[15px] text-[var(--color-muted)]">{widgets.error.message}</p>
        </Card>
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
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-text)]">{board.name}</h1>
          <p className="tnum mt-1 font-mono2 text-[12px] text-[var(--color-muted)]">
            {widgets.data.length} widget · {deviceCount.size} device
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`/dashboards/${encodeURIComponent(id)}`}>
            Muat ulang
          </a>
        </Button>
      </div>
      <DashboardCanvas widgets={widgets.data} devices={devs.ok ? devs.data : []} />
      <section aria-label="Tambah widget" className="mt-8">
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">Tambah widget</h2>
        <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--color-muted)]">
          Pilih jenis, device pemilik pin, dan pin. Posisi tersusun otomatis; geser manual menyusul di W12.
        </p>
        <div className="mt-4">
          <WidgetAddForm dashboardId={id} devices={devs.ok ? devs.data : []} />
        </div>
      </section>
    </div>
  );
}
