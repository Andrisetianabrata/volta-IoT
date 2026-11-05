import { sessionToken, upstream } from "@/lib/auth";
import { HealthStrip } from "@/components/health-strip";
import { PageHead } from "@/components/coming-soon";
import { Card } from "@/components/ui/card";

/* Halaman Health (W3): strip + angka admin dari /admin/stats.
   Semua angka dari respons; tanpa sesi valid tidak sampai sini (guard shell). */

type Snapshot = { uptime_secs?: number; msgs?: number; cmds?: number; logins?: number };

function fmtUptime(s?: number) {
  if (typeof s !== "number") return "-";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}d`;
}

export default async function HealthPage() {
  const token = await sessionToken();
  const r = await upstream("/admin/stats", token ? { token } : {});
  const s = (r.ok ? (r.json as Snapshot) : null) ?? null;
  const rows: Array<[string, string]> = s
    ? [
        ["Waktu jalan", fmtUptime(s.uptime_secs)],
        ["Pesan diteruskan", typeof s.msgs === "number" ? String(s.msgs) : "-"],
        ["Perintah dikirim", typeof s.cmds === "number" ? String(s.cmds) : "-"],
        ["Login tercatat", typeof s.logins === "number" ? String(s.logins) : "-"],
      ]
    : [];
  return (
    <div>
      <PageHead title="Health" desc="Kondisi server dari sumber yang sama dengan strip Monitor." />
      <HealthStrip />
      <Card className="mt-4">
      <section aria-label="Statistik server">
        {s ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono2 text-[12px] text-[var(--color-muted)]">{k}</dt>
                <dd className="tnum mt-1 text-[24px] font-semibold text-[var(--color-text)]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[15px] text-[var(--color-muted)]">
            Statistik tidak bisa diambil{r.ok ? "" : `: ${r.error.message}`}. Strip di atas tetap dari /healthz.
          </p>
        )}
      </section>
      </Card>
    </div>
  );
}
