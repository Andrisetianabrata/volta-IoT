import { api } from "@/lib/api";
import { PageHead } from "@/components/coming-soon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardList } from "@/components/dashboard-list";

export default async function DashboardsPage() {
  const r = await api.dashboards();
  if (!r.ok) {
    return (
      <div>
        <PageHead title="Dashboards" desc="Board berisi widget dari banyak device." />
        <Card>
          <p className="text-[17px] font-semibold text-[var(--color-text)]">Daftar board tidak bisa dimuat.</p>
          <p className="mt-2 text-[15px] text-[var(--color-muted)]">{r.error.message}</p>
          <Button asChild variant="outline" className="mt-4">
            <a href="/dashboards">
              Muat ulang
            </a>
          </Button>
        </Card>
      </div>
    );
  }
  return (
    <div>
      <PageHead title="Dashboards" desc={`${r.data.length} board. Satu board memuat widget dari banyak device.`} />
      <DashboardList initial={r.data} />
    </div>
  );
}
