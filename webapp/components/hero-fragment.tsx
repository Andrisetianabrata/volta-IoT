"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PinChart } from "./pin-chart";
import type { PinPoint } from "../lib/chart-scale";

/* Fragmen produk yang bekerja: kontrol pin V0, grafik Recharts. Bukan data device asli. */

export function HeroFragment({
  chart,
}: {
  chart?: { line?: string; grid?: string; tick?: string };
} = {}) {
  const [value, setValue] = useState(1820);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [tick, setTick] = useState(0);

  const series: PinPoint[] = useMemo(() => {
    const out: PinPoint[] = [];
    let v = 1790;
    for (let i = 0; i < 24; i++) {
      v += Math.sin(i / 3) * 22 + ((i * 37) % 11) - 5;
      out.push({ t: `${String(i).padStart(2, "0")}:00`, v: Math.round(v) });
    }
    const last = mode === "manual" ? value : Math.round(out[out.length - 2].v + Math.sin(tick) * 8);
    out[out.length - 1] = { t: "23:00", v: last };
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, Math.floor(tick / 4)]);

  return (
    <div
      data-ui
      className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-8"
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono2 text-[13px] uppercase tracking-wide text-[var(--color-muted)]">pin V0 . demo</p>
        <span className="inline-flex items-center gap-2 font-mono2 text-[13px] text-[var(--color-muted)]">
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--color-accent)" }}
          />
          simulasi lokal
        </span>
      </div>
      <p className="tnum mt-4 font-mono2 text-5xl" aria-live="polite">
        {series[series.length - 1].v}
        <span className="ml-2 text-base text-[var(--color-muted)]">ADC</span>
      </p>
      <div className="mt-4">
        <PinChart data={series} label="Grafik demo nilai pin V0" {...chart} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span id="pin-demo-label" className="font-mono2 text-[13px] text-[var(--color-muted)]">
          Atur V0
        </span>
        <Slider
          name="pin-demo"
          aria-labelledby="pin-demo-label"
          min={1500}
          max={2100}
          step={1}
          value={[value]}
          onValueChange={([v]) => {
            setValue(v);
            setMode("manual");
          }}
          className="w-full py-5"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setMode("auto");
            setTick((t) => t + 1);
          }}
          className="min-h-[44px] shrink-0"
        >
          Acak
        </Button>
      </div>
      <p className="mt-3 text-[13px] text-[var(--color-muted)]">
        Demo interaktif di halaman ini. Data device asli muncul setelah masuk dan memilih device.
      </p>
    </div>
  );
}
