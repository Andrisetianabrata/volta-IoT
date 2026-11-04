"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { WidgetCard } from "./card";
import type { WidgetProps } from "./registry";

function cfgOf(config: string): { device?: string; label?: string; unit?: string; min?: number; max?: number } {
  try {
    return JSON.parse(config || "{}") as { device?: string; label?: string; unit?: string; min?: number; max?: number };
  } catch {
    return {};
  }
}

/* Geser: nilai live sebagai posisi awal, kirim saat dilepas. */
export function CommandSliderWidget({ widget, value, onCommand }: WidgetProps) {
  const c = cfgOf(widget.config);
  const device = c.device ?? "";
  const min = typeof c.min === "number" ? c.min : 0;
  const max = typeof c.max === "number" && c.max > min ? c.max : 100;
  const live = value === undefined || value === "" ? null : Number(value);
  const [pos, setPos] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!busy && live !== null && !Number.isNaN(live)) setPos(live);
  }, [live, busy]);
  if (!device) {
    return (
      <WidgetCard title={c.label ?? widget.pin} meta="belum terikat">
        <p className="text-[15px] text-[var(--color-muted)]">Widget ini belum diikat ke device (isi config.device).</p>
      </WidgetCard>
    );
  }
  const shown = pos ?? (live !== null && !Number.isNaN(live) ? live : min);
  async function commit(v: number[]) {
    const target = Math.round(v[0] ?? min);
    setBusy(true);
    setNote(null);
    const r = await onCommand(device, widget.pin, String(target));
    setBusy(false);
    setNote(r.error ?? `Terkirim ${target}.`);
  }
  return (
    <WidgetCard title={c.label ?? widget.pin} meta={note ?? `${shown}${c.unit ? ` ${c.unit}` : ""}`}>
      <p className="tnum text-[24px] font-semibold text-[var(--color-text)]" aria-live="polite">
        {shown}
        {c.unit ? <span className="ml-2 text-[14px] font-normal text-[var(--color-muted)]">{c.unit}</span> : null}
      </p>
      <Slider
        className="mt-3"
        aria-label={c.label ?? widget.pin}
        min={min}
        max={max}
        step={max - min > 100 ? 1 : 1}
        value={[Math.min(max, Math.max(min, shown))]}
        onValueChange={(v) => setPos(v[0] ?? min)}
        onValueCommit={commit}
        disabled={busy}
      />
      <div className="tnum mt-1 flex justify-between font-mono2 text-[12px] text-[var(--color-faint)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </WidgetCard>
  );
}
