"use client";

import type { Widget } from "@/lib/api";
import type { WidgetProps } from "./registry";
import { WidgetCard } from "./card";

function cfg(widget: Widget): { label?: string; unit?: string } {
  try {
    return JSON.parse(widget.config || "{}") as { label?: string; unit?: string };
  } catch {
    return {};
  }
}

export function LabeledValueWidget({ widget, value }: WidgetProps) {
  const c = cfg(widget);
  return (
    <WidgetCard title={c.label ?? widget.pin} meta={c.unit}>
      {value === undefined || value === "" ? (
        <p className="tnum text-[24px] text-[var(--color-faint)]">-</p>
      ) : (
        <p className="tnum text-[24px] font-semibold text-[var(--color-text)]">
          {value}
          {c.unit ? <span className="ml-2 text-[14px] font-normal text-[var(--color-muted)]">{c.unit}</span> : null}
        </p>
      )}
    </WidgetCard>
  );
}
