"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Device } from "@/lib/api";
import { createWidgetAction } from "@/lib/actions";
import { WIDGET_MANIFEST } from "./widgets/registry";

const field =
  "min-h-[44px] w-full min-w-0 border border-[var(--color-control)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-faint)] hover:border-[var(--color-muted)] focus:border-[var(--color-accent)]";

/* Tambah widget ke board: pilih kind + device pemilik pin + pin.
   Config (x/y/w/h) diisi default; geser manual menyusul W12. */
export function WidgetAddForm({ dashboardId, devices }: { dashboardId: string; devices: Device[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createWidgetAction.bind(null, dashboardId), null);
  const [kind, setKind] = useState<string>("gauge");
  useEffect(() => {
    if (!state?.error) router.refresh();
  }, [state, router]);
  if (devices.length === 0) {
    return (
      <p className="text-[15px] text-[var(--color-muted)]">
        Belum ada device. <a href="/devices" className="font-semibold text-[var(--color-text)] underline underline-offset-4">Tambah device dulu</a>,
        lalu kembali ke sini untuk memasang widget.
      </p>
    );
  }
  const showUnit = kind === "gauge" || kind === "labeled-value" || kind === "history-chart";
  const showMinMax = kind === "gauge" || kind === "slider";
  const showOnOff = kind === "button" || kind === "switch";
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label htmlFor="w-kind" className="font-mono2 text-[12px] text-[var(--color-muted)]">Jenis widget</label>
        <select id="w-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={`${field} mt-1`}>
          {WIDGET_MANIFEST.map((m) => (
            <option key={m.kind} value={m.kind}>{m.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="w-device" className="font-mono2 text-[12px] text-[var(--color-muted)]">Device pemilik pin</label>
        <select id="w-device" name="device" defaultValue="" className={`${field} mt-1`} required>
          <option value="" disabled>Pilih device</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="w-pin" className="font-mono2 text-[12px] text-[var(--color-muted)]">Pin</label>
        <Input id="w-pin" name="pin" maxLength={40} placeholder="cth. t1, relay" className="mt-1" required />
      </div>
      <div>
        <label htmlFor="w-label" className="font-mono2 text-[12px] text-[var(--color-muted)]">Label (opsional)</label>
        <Input id="w-label" name="label" maxLength={40} placeholder="cth. Suhu" className="mt-1" />
      </div>
      {showUnit ? (
        <div>
          <label htmlFor="w-unit" className="font-mono2 text-[12px] text-[var(--color-muted)]">Satuan (opsional)</label>
          <Input id="w-unit" name="unit" maxLength={12} placeholder="cth. °C" className="mt-1" />
        </div>
      ) : null}
      {showMinMax ? (
        <>
          <div>
            <label htmlFor="w-min" className="font-mono2 text-[12px] text-[var(--color-muted)]">Minimum</label>
            <Input id="w-min" name="min" inputMode="numeric" placeholder="0" className="mt-1" />
          </div>
          <div>
            <label htmlFor="w-max" className="font-mono2 text-[12px] text-[var(--color-muted)]">Maksimum</label>
            <Input id="w-max" name="max" inputMode="numeric" placeholder="100" className="mt-1" />
          </div>
        </>
      ) : null}
      {showOnOff ? (
        <>
          <div>
            <label htmlFor="w-on" className="font-mono2 text-[12px] text-[var(--color-muted)]">Nilai ON</label>
            <Input id="w-on" name="on" maxLength={16} placeholder="1" className="mt-1" />
          </div>
          <div>
            <label htmlFor="w-off" className="font-mono2 text-[12px] text-[var(--color-muted)]">Nilai OFF</label>
            <Input id="w-off" name="off" maxLength={16} placeholder="0" className="mt-1" />
          </div>
        </>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending} className="min-h-[44px]">
          {pending ? "Menambah…" : "Tambah widget"}
        </Button>
        {state?.error ? (
          <p role="alert" className="mt-2 text-[15px] text-[var(--color-text)]">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
