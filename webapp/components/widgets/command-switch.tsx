"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "./card";
import type { WidgetProps } from "./registry";

function cfgOf(config: string): { device?: string; label?: string; on?: string; off?: string } {
  try {
    return JSON.parse(config || "{}") as { device?: string; label?: string; on?: string; off?: string };
  } catch {
    return {};
  }
}

/* Saklar ON/OFF: dua tombol segmented, status ikut nilai live. */
export function CommandSwitchWidget({ widget, value, onCommand }: WidgetProps) {
  const c = cfgOf(widget.config);
  const device = c.device ?? "";
  const onVal = c.on ?? "1";
  const offVal = c.off ?? "0";
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!device) {
    return (
      <WidgetCard title={c.label ?? widget.pin} meta="belum terikat">
        <p className="text-[15px] text-[var(--color-muted)]">Widget ini belum diikat ke device (isi config.device).</p>
      </WidgetCard>
    );
  }
  const isOn = value === onVal;
  async function kirim(v: string) {
    setBusy(true);
    setNote(null);
    const r = await onCommand(device, widget.pin, v);
    setBusy(false);
    setNote(r.error ?? null);
  }
  return (
    <WidgetCard title={c.label ?? widget.pin} meta={value === undefined || value === "" ? "tidak ada data" : isOn ? "ON" : "OFF"}>
      <div className="flex gap-2" role="group" aria-label={c.label ?? widget.pin}>
        <Button
          type="button"
          variant={isOn ? "default" : "outline"}
          aria-pressed={isOn}
          disabled={busy}
          onClick={() => kirim(onVal)}
          className="min-h-[44px] flex-1"
        >
          ON
        </Button>
        <Button
          type="button"
          variant={!isOn && value !== undefined && value !== "" ? "default" : "outline"}
          aria-pressed={!isOn}
          disabled={busy}
          onClick={() => kirim(offVal)}
          className="min-h-[44px] flex-1"
        >
          OFF
        </Button>
      </div>
      {note ? <p className="mt-2 text-[14px] text-[var(--color-muted)]">{note}</p> : null}
    </WidgetCard>
  );
}
