"use client";

import { useEffect, useRef, useState } from "react";

/* WebSocket /stream satu koneksi per device terpilih. Token sekali pakai
   diambil dari /api/ws-token (hanya di memori), reconnect backoff. */

function wsBase(): string {
  const env = process.env.NEXT_PUBLIC_VOLTA_WS_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return `wss://${window.location.host}`;
  }
  return "ws://127.0.0.1:9443";
}

export function useDeviceStream(deviceId: string | null) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const backoff = useRef(2000);

  useEffect(() => {
    if (!deviceId) {
      setValues({});
      setConnected(false);
      return;
    }
    let dead = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const id = deviceId;

    async function open() {
      if (dead) return;
      try {
        const t = await (await fetch("/api/ws-token", { cache: "no-store" })).json().catch(() => null);
        const token = (t as { token?: string } | null)?.token;
        if (!token || dead) {
          timer = setTimeout(open, backoff.current);
          return;
        }
        ws = new WebSocket(`${wsBase()}/devices/${encodeURIComponent(id)}/stream?token=${encodeURIComponent(token)}`);
        ws.onopen = () => {
          if (!dead) {
            setConnected(true);
            backoff.current = 2000;
          }
        };
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(String(ev.data)) as { pin?: string; value?: string };
            if (m.pin !== undefined && m.value !== undefined) {
              setValues((v) => (v[m.pin as string] === m.value ? v : { ...v, [m.pin as string]: String(m.value) }));
            }
          } catch {
            /* abaikan baris non-JSON (mis. sapaan "connected") */
          }
        };
        const down = () => {
          if (dead) return;
          setConnected(false);
          backoff.current = Math.min(backoff.current * 2, 30000);
          timer = setTimeout(open, backoff.current);
        };
        ws.onclose = down;
        ws.onerror = () => ws?.close();
      } catch {
        timer = setTimeout(open, backoff.current);
      }
    }
    open();
    return () => {
      dead = true;
      if (timer) clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* abaikan */
      }
    };
  }, [deviceId]);

  return { values, connected };
}
