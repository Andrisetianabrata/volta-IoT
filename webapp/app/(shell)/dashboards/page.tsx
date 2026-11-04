import { api } from "@/lib/api";
import { PageHead } from "@/components/coming-soon";
import { DashboardList } from "@/components/dashboard-list";

export default async function DashboardsPage() {
  const r = await api.dashboards();
  if (!r.ok) {
    return (
      <div>
        <PageHead title="Dashboards" desc="Board berisi widget dari banyak device." />
        <section aria-label="Daftar board tidak bisa dimuat" className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-[15px] font-semibold text-[var(--color-text)]">Daftar board tidak bisa dimuat.</p>
          <p className="mt-2 text-[15px] text-[var(--color-muted)]">{r.error.message}</p>
          <a
            href="/dashboards"
            className="mt-3 inline-flex min-h-[44px] items-center border border-[var(--color-border)] px-4 text-[15px] font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
          >
            Muat ulang
          </a>
        </section>
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
