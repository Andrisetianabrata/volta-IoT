"use client";

import { useEffect, useMemo, useState } from "react";
import type { Device, Widget } from "@/lib/api";
import { sendPinAction } from "@/lib/actions";
import { WidgetView } from "./widgets/registry";

function cfgOf(config: string): { device?: string; w?: number } {
  try {
    return JSON.parse(config || "{}") as { device?: string; w?: number };
  } catch {
    return {};
  }
}

function wsBase(): string {
  const env = process.env.NEXT_PUBLIC_VOLTA_WS_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return `wss://${window.location.host}`;
  }
  return "ws://127.0.0.1:9443";
}

/* Satu koneksi WS per device yang dipakai board (fan-in).
   Kunci nilai per device lalu pin: values[device][pin]. */
function useBoardValues(deviceIds: string[]) {
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [live, setLive] = useState<string[]>([]);
  const key = useMemo(() => [...deviceIds].sort().join(","), [deviceIds]);
  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;
    let dead = false;
    const sockets: WebSocket[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    setValues({});
    setLive([]);
    async function open(id: string, waitMs: number) {
      if (dead) return;
      try {
        const t = (await (await fetch("/api/ws-token", { cache: "no-store" })).json().catch(() => null)) as {
          token?: string;
        } | null;
        if (!t?.token || dead) {
          if (!dead) timers.push(setTimeout(() => open(id, Math.min(waitMs * 2, 30000)), waitMs));
          return;
        }
        const ws = new WebSocket(`${wsBase()}/devices/${encodeURIComponent(id)}/stream?token=${encodeURIComponent(t.token)}`);
        sockets.push(ws);
        ws.onopen = () => {
          if (!dead) setLive((v) => (v.includes(id) ? v : [...v, id]));
        };
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(String(ev.data)) as { pin?: string; value?: string };
            if (m.pin !== undefined && m.value !== undefined) {
              setValues((v) => ({ ...v, [id]: { ...v[id], [m.pin as string]: String(m.value) } }));
            }
          } catch {
            /* abaikan baris non-JSON */
          }
        };
        const down = () => {
          if (dead) return;
          setLive((v) => v.filter((x) => x !== id));
          timers.push(setTimeout(() => open(id, Math.min(waitMs * 2, 30000)), waitMs));
        };
        ws.onclose = down;
        ws.onerror = () => ws.close();
      } catch {
        if (!dead) timers.push(setTimeout(() => open(id, Math.min(waitMs * 2, 30000)), waitMs));
      }
    }
    for (const id of ids) void open(id, 2000);
    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      for (const ws of sockets) {
        try {
          ws.close();
        } catch {
          /* abaikan */
        }
      }
    };
  }, [key]);
  return { values, live };
}

export function DashboardCanvas({ widgets, devices }: { widgets: Widget[]; devices: Device[] }) {
  const names = useMemo(() => new Map(devices.map((d) => [d.id, d.name])), [devices]);
  const deviceIds = useMemo(() => {
    const s = new Set<string>();
    for (const w of widgets) {
      const d = cfgOf(w.config).device;
      if (d) s.add(d);
    }
    return [...s];
  }, [widgets]);
  const { values, live } = useBoardValues(deviceIds);
  if (widgets.length === 0) {
    return (
      <section aria-label="Board kosong" className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="text-[15px] font-semibold text-[var(--color-text)]">Board ini belum punya widget.</p>
        <p className="mt-2 text-[15px] text-[var(--color-muted)]">
          Tambah widget pertama lewat formulir di bawah. Hapus/ubah widget menyusul di editor W12.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Kanvas board">
      <p className="tnum mb-3 font-mono2 text-[12px] text-[var(--color-faint)]" aria-live="polite">
        {deviceIds.length === 0
          ? "Belum ada widget yang terikat ke device."
          : `Live: ${live.length}/${deviceIds.length} device terhubung.`}
      </p>
      <div className="board-grid">
        {widgets.map((w) => {
          const c = cfgOf(w.config);
          const span = Math.min(12, Math.max(1, typeof c.w === "number" ? c.w : 4));
          const dev = c.device ?? "";
          return (
            <div key={w.id} style={{ gridColumn: `span ${span}` }} className="min-w-0">
              <WidgetView
                widget={w}
                value={dev ? values[dev]?.[w.pin] : undefined}
                onCommand={async (deviceId, pin, value) => sendPinAction(deviceId, pin, value)}
              />
              {dev && names.get(dev) ? (
                <p className="tnum mt-1 font-mono2 text-[12px] text-[var(--color-faint)]">{names.get(dev)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
