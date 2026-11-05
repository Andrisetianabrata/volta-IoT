"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Device, DeviceStatus } from "@/lib/api";
import { createDeviceAction, deleteDeviceAction } from "@/lib/actions";
import { formatAgo } from "@/lib/format";

export type DeviceRow = { device: Device; status: DeviceStatus };

function StatusPill({ status }: { status: DeviceStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <span
        aria-hidden="true"
        className="inline-block size-2.5 rounded-full bg-[var(--color-accent)]"
        style={status.online ? undefined : { background: "var(--color-control)" }}
      />
      <span className={status.online ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]"}>
        {status.online ? "Online" : "Offline"}
      </span>
      <span className="tnum font-mono2 text-[12px] text-[var(--color-faint)]">{formatAgo(status.updated_at)}</span>
    </span>
  );
}

function CopyOnce({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="tnum min-w-0 flex-1 truncate font-mono2 text-[13px] text-[var(--color-text)]" title={text}>
        {text}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={copy}
        aria-label={done ? `${label} disalin` : `Salin ${label}`}
        className="min-h-[44px] shrink-0"
      >
        {done ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
        {done ? "Disalin" : "Salin"}
      </Button>
    </div>
  );
}

/* Satu layar kelola device (DESIGN-APP.md §6): form + daftar dalam Card 8px. */
export function DeviceManager({ initial }: { initial: DeviceRow[] }) {
  const router = useRouter();
  const [createState, createForm, creating] = useActionState(createDeviceAction, null);
  const [arming, setArming] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  useEffect(() => {
    if (createState?.device_id) router.refresh();
  }, [createState?.device_id, router]);
  async function hapus(id: string) {
    if (arming !== id) {
      setArming(id);
      return;
    }
    setDelError(null);
    const r = await deleteDeviceAction(id);
    if (r.error) {
      setDelError(r.error);
      return;
    }
    setArming(null);
    router.refresh();
  }
  return (
    <div>
      <Card>
      <form action={createForm} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="device-name" className="font-mono2 text-[12px] text-[var(--color-muted)]">
            Nama device baru
          </label>
          <Input id="device-name" name="name" maxLength={80} placeholder="cth. ESP32 Ruang Server" className="mt-1.5" />
        </div>
        <Button type="submit" disabled={creating} className="min-h-[44px] shrink-0 active:translate-y-px">
          {creating ? "Menambah…" : "Tambah device"}
        </Button>
      </form>
      </Card>
      {createState?.error ? (
        <p role="alert" className="mt-3 border border-[#C4242A] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text)]" style={{ borderRadius: "var(--radius)" }}>
          {createState.error}
        </p>
      ) : null}
      {createState?.device_id && createState.token ? (
        <Card className="mt-4 border-[var(--color-accent)]">
          <p className="text-[17px] font-semibold text-[var(--color-text)]">Device dibuat. Salin sekarang.</p>
          <p className="mt-1 max-w-xl text-[14px] text-[var(--color-muted)]">
            Token hanya tampil sekali ini. Masukkan ke firmware (WiFi provisioning), lalu token ini tidak bisa dilihat
            lagi.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <p className="font-mono2 text-[12px] text-[var(--color-muted)]">ID device</p>
              <CopyOnce label="ID device" text={createState.device_id} />
            </div>
            <div>
              <p className="font-mono2 text-[12px] text-[var(--color-muted)]">Token</p>
              <CopyOnce label="Token" text={createState.token} />
            </div>
          </div>
        </Card>
      ) : null}
      {initial.length === 0 ? (
        <Card className="mt-4">
          <p className="text-[20px] font-semibold text-[var(--color-text)]">Belum ada device.</p>
          <p className="mt-2 max-w-xl text-[15px] text-[var(--color-muted)]">
            Tambah device pertama lewat formulir di atas. Setelah firmware tersambung, status berubah Online dan pin
            bisa dipantau di Monitor.
          </p>
        </Card>
      ) : (
        <Card className="mt-4 p-2">
        <ul className="divide-y divide-[var(--color-rule)]">
          {initial.map(({ device, status }) => (
            <li key={device.id}>
              <div className="flex min-h-[64px] items-center gap-2 px-2 py-1 transition-[translate,background-color] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">
                <Link
                  href={`/devices/${encodeURIComponent(device.id)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 hover:bg-[var(--color-accent-tint)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="min-w-0 flex-1 py-1">
                    <span className="block truncate text-[17px] font-semibold text-[var(--color-text)]">
                      {device.name}
                    </span>
                    <StatusPill status={status} />
                  </span>
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-[var(--color-faint)]" />
                </Link>
                <button
                  type="button"
                  onClick={() => hapus(device.id)}
                  onBlur={() => setArming(null)}
                  aria-label={arming === device.id ? `Yakin hapus ${device.name}? Klik lagi untuk hapus.` : `Hapus ${device.name}`}
                  style={{ borderRadius: "var(--radius)" }}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1 px-2 text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-text)]"
                >
                  <Trash2 aria-hidden="true" size={18} strokeWidth={1.5} />
                  {arming === device.id ? <span className="pr-1 text-[14px] font-semibold">Yakin?</span> : null}
                </button>
              </div>
            </li>
          ))}
        </ul>
        </Card>
      )}
      {delError ? (
        <p role="alert" className="mt-2 text-[15px] text-[var(--color-text)]">
          {delError}
        </p>
      ) : null}
    </div>
  );
}
