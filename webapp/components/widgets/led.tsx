"use client";

import type { WidgetProps } from "./registry";
import { WidgetCard } from "./card";

export function LedWidget({ widget, value }: WidgetProps) {
  const on = value === "1" || value?.toLowerCase() === "on" || value === "true";
  return (
    <WidgetCard title={widget.pin} meta={on ? "nyala" : "mati"}>
      <p className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-block size-3 rounded-full"
          style={{ background: on ? "var(--color-accent)" : "var(--color-control)" }}
        />
        <span className="tnum text-[24px] font-semibold text-[var(--color-text)]">{on ? "1" : "0"}</span>
      </p>
    </WidgetCard>
  );
}
