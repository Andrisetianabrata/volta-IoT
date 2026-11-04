"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PinChart } from "@/components/pin-chart";
import type { PinPoint } from "@/lib/chart-scale";
import { WidgetCard } from "./card";
import type { WidgetProps } from "./registry";

function cfgOf(config: string): { device?: string; label?: string; unit?: string } {
  try {
    return JSON.parse(config || "{}") as { device?: string; label?: string; unit?: string };
  } catch {
    return {};
  }
}

type Range = "1H" | "24H";

/* Grafik history pin milik widget. Ambil via BFF (/api/* teruskan query).
   Pin non-numerik dilewati, jumlahnya dicatat jujur. */
export function HistoryChartWidget({ widget }: WidgetProps) {
  const c = cfgOf(widget.config);
  const device = c.device ?? "";
  const [range, setRange] = useState<Range>("1H");
  const [data, setData] = useState<PinPoint[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!device) return;
    let dead = false;
    setData(null);
    setError(null);
    const span = range === "1H" ? 3600 : 86400;
    const to = Math.floor(Date.now() / 1000);
    const from = to - span;
    fetch(`/api/devices/${encodeURIComponent(device)}/history/${encodeURIComponent(widget.pin)}?from=${from}&to=${to}&limit=500`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as { device_id?: string; pin?: string; value?: string; ts?: number }[] | null;
        if (!res.ok) throw new Error(`Server menjawab ${res.status}.`);
        if (dead) return;
        let skip = 0;
        const pts: PinPoint[] = [];
        for (const p of j ?? []) {
          const v = Number(p?.value);
          if (p?.ts === undefined || Number.isNaN(v)) {
            skip += 1;
            continue;
          }
          pts.push({
            t: new Date((p.ts as number) * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
            v,
          });
        }
        setSkipped(skip);
        setData(pts);
      })
      .catch((e: unknown) => {
        if (!dead) setError(e instanceof Error ? e.message : "Gagal memuat history.");
      });
    return () => {
      dead = true;
    };
  }, [device, widget.pin, range]);
  if (!device) {
    return (
      <WidgetCard title={c.label ?? widget.pin} meta="belum terikat">
        <p className="text-[15px] text-[var(--color-muted)]">Widget ini belum diikat ke device (isi config.device).</p>
      </WidgetCard>
    );
  }
  return (
    <WidgetCard
      title={c.label ?? widget.pin}
      meta={skipped > 0 ? `${skipped} sampel non-angka dilewati` : c.unit}
    >
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Rentang history">
        {(["1H", "24H"] as const).map((r) => (
          <Button
            key={r}
            type="button"
            role="tab"
            aria-selected={range === r}
            variant={range === r ? "default" : "outline"}
            onClick={() => setRange(r)}
            className="min-h-[44px] flex-1 sm:flex-none sm:px-6"
          >
            {r === "1H" ? "1 jam" : "24 jam"}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-[15px] text-[var(--color-muted)]">History tidak bisa dimuat: {error}</p>
      ) : data === null ? (
        <p className="text-[15px] text-[var(--color-muted)]">Memuat history…</p>
      ) : (
        <PinChart data={data} label={`${c.label ?? widget.pin} ${range}`} />
      )}
    </WidgetCard>
  );
}
