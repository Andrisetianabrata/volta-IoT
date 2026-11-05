import { upstream } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* Strip kesehatan (W3, DESIGN-APP.md): KPI di Card 8px dari GET /healthz.
   Server mati = pesan eksplisit, bukan angka basi. */

type Health = {
  broker?: { local_port?: number; tls_port?: number };
  db?: { ok?: boolean };
  mailer?: { ok?: boolean; pending?: number };
  stats?: { uptime_secs?: number; msgs?: number; cmds?: number; logins?: number };
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <li>
      <p className="font-mono2 text-[12px] text-[var(--color-muted)]">{label}</p>
      <p className="tnum mt-1 text-[30px] leading-none font-semibold text-[var(--color-text)]">{value}</p>
      {sub ? <p className="tnum mt-1 text-[13px] text-[var(--color-muted)]">{sub}</p> : null}
    </li>
  );
}

export async function HealthStrip() {
  const r = await upstream("/healthz", {});
  const at = new Date().toLocaleTimeString("id-ID", { hour12: false });
  if (!r.ok) {
    return (
      <section aria-label="Kesehatan server">
        <Card>
        <p className="flex items-center gap-2 text-[17px] font-semibold text-[var(--color-text)]">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-[#C4242A] dark:bg-[#E5566F]" />
          Server tidak terjangkau
        </p>
        <p className="mt-2 text-[15px] text-[var(--color-muted)]">{r.error.message}</p>
        <Button asChild variant="outline" className="mt-4">
          <a href="/health">
            Muat ulang
          </a>
        </Button>
        </Card>
      </section>
    );
  }
  const h = (r.json ?? {}) as Health;
  const broker = h.broker?.local_port ?? "-";
  const tls = h.broker?.tls_port;
  const mailOk = h.mailer?.ok;
  const pending = typeof h.mailer?.pending === "number" ? String(h.mailer.pending) : "-";
  const msgs = typeof h.stats?.msgs === "number" ? String(h.stats.msgs) : "-";
  return (
    <section aria-label="Kesehatan server">
      <Card>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Broker MQTT" value={String(broker)} sub={tls !== undefined ? `lokal · TLS ${tls}` : "lokal"} />
        <Kpi label="Basis data" value={h.db?.ok ? "OK" : "Mati"} />
        <Kpi label="Mailer" value={mailOk ? "OK" : "Mati"} sub={mailOk ? undefined : "cek konfigurasi"} />
        <Kpi label="Antre surat" value={pending} sub="menunggu kirim" />
        <Kpi label="Pesan" value={msgs} sub="total diteruskan" />
      </ul>
      <p className="tnum mt-4 font-mono2 text-[12px] text-[var(--color-faint)]">
        Diperbarui {at} dari /healthz.
      </p>
      </Card>
    </section>
  );
}
