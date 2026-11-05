"use client";

import type { Widget } from "@/lib/api";
import type { WidgetProps } from "./registry";
import { WidgetCard } from "./card";

function cfg(widget: Widget): { label?: string; unit?: string; min?: number; max?: number } {
  try {
    return JSON.parse(widget.config || "{}") as { label?: string; unit?: string; min?: number; max?: number };
  } catch {
    return {};
  }
}

/* Gauge: angka besar + trek tipis proporsi terhadap maks. Tanpa jarum. */
export function GaugeWidget({ widget, value }: WidgetProps) {
  const c = cfg(widget);
  const min = typeof c.min === "number" ? c.min : 0;
  const max = typeof c.max === "number" && c.max > min ? c.max : 100;
  const v = value === undefined || value === "" ? null : Number(value);
  const ratio = v === null || Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, (v - min) / (max - min)));
  return (
    <WidgetCard title={c.label ?? widget.pin} meta={c.unit}>
      {v === null || Number.isNaN(v) ? (
        <p className="tnum text-[24px] text-[var(--color-faint)]">-</p>
      ) : (
        <p className="tnum text-[24px] font-semibold text-[var(--color-text)]">
          {v}
          {c.unit ? <span className="ml-2 text-[14px] font-normal text-[var(--color-muted)]">{c.unit}</span> : null}
        </p>
      )}
      <div className="mt-3" role="img" aria-label={`Skala ${min} sampai ${max}`}>
        <div className="h-[6px] w-full rounded-full bg-[var(--color-raised)]">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <div className="tnum mt-1 flex justify-between font-mono2 text-[12px] text-[var(--color-faint)]">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </WidgetCard>
  );
}
