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

/* Tombol perintah: klik kirim nilai `on` ke device milik widget. */
export function CommandButtonWidget({ widget, onCommand }: WidgetProps) {
  const c = cfgOf(widget.config);
  const device = c.device ?? "";
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!device) {
    return (
      <WidgetCard title={c.label ?? widget.pin} meta="belum terikat">
        <p className="text-[15px] text-[var(--color-muted)]">Widget ini belum diikat ke device (isi config.device).</p>
      </WidgetCard>
    );
  }
  async function kirim() {
    setBusy(true);
    setNote(null);
    const r = await onCommand(device, widget.pin, c.on ?? "1");
    setBusy(false);
    setNote(r.error ?? "Terkirim.");
  }
  return (
    <WidgetCard title={c.label ?? widget.pin} meta={note ?? undefined}>
      <Button type="button" onClick={kirim} disabled={busy} className="min-h-[44px] w-full">
        {busy ? "Mengirim…" : `Kirim ${c.on ?? "1"}`}
      </Button>
    </WidgetCard>
  );
}
