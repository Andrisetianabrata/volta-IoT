"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

/* Server Action: mutasi dashboard + kirim perintah. Token tetap di server. */

export async function createDashboardAction(_prev: { error?: string } | null, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Isi nama dashboard dulu." };
  const r = await api.createDashboard(name.slice(0, 80));
  if (!r.ok) return { error: r.error.message };
  revalidatePath("/dashboards");
  return { error: undefined as string | undefined, id: r.data.id };
}

export async function deleteDashboardAction(id: string) {
  const r = await api.deleteDashboard(id);
  if (!r.ok) return { error: r.error.message };
  revalidatePath("/dashboards");
  return { error: undefined as string | undefined };
}

export async function sendPinAction(deviceId: string, pin: string, value: string) {
  const r = await api.sendPin(deviceId, pin, value);
  if (!r.ok) return { error: r.error.message };
  return { error: undefined as string | undefined };
}

export async function createDeviceAction(_prev: { error?: string } | null, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Isi nama device dulu.", device_id: undefined as string | undefined, token: undefined as string | undefined };
  const r = await api.createDevice(name.slice(0, 80));
  if (!r.ok) return { error: r.error.message, device_id: undefined as string | undefined, token: undefined as string | undefined };
  revalidatePath("/devices");
  return { error: undefined as string | undefined, device_id: r.data.device_id, token: r.data.token };
}

export async function deleteDeviceAction(id: string) {
  const r = await api.deleteDevice(id);
  if (!r.ok) return { error: r.error.message };
  revalidatePath("/devices");
  revalidatePath("/dashboards");
  return { error: undefined as string | undefined };
}

const WIDGET_DEFAULT_W: Record<string, number> = {
  gauge: 4,
  "labeled-value": 4,
  led: 2,
  button: 2,
  switch: 2,
  slider: 4,
  "history-chart": 8,
};

export async function createWidgetAction(dashboardId: string, _prev: { error?: string } | null, form: FormData) {
  const kind = String(form.get("kind") ?? "");
  const pin = String(form.get("pin") ?? "").trim();
  const device = String(form.get("device") ?? "");
  const label = String(form.get("label") ?? "").trim();
  if (!kind) return { error: "Pilih jenis widget dulu." };
  if (!device) return { error: "Pilih device pemilik pin dulu." };
  if (!pin) return { error: "Isi nama pin dulu (cth. t1, relay)." };
  const num = (k: string) => {
    const s = String(form.get(k) ?? "").trim();
    return s === "" ? undefined : Number(s);
  };
  const cfg: Record<string, unknown> = { device, x: 0, y: 0, w: WIDGET_DEFAULT_W[kind] ?? 4, h: kind === "history-chart" ? 2 : 1 };
  if (label) cfg.label = label.slice(0, 40);
  const unit = String(form.get("unit") ?? "").trim();
  if (unit) cfg.unit = unit.slice(0, 12);
  const min = num("min");
  const max = num("max");
  if (min !== undefined && !Number.isNaN(min)) cfg.min = min;
  if (max !== undefined && !Number.isNaN(max)) cfg.max = max;
  const on = String(form.get("on") ?? "").trim();
  const off = String(form.get("off") ?? "").trim();
  if (on) cfg.on = on.slice(0, 16);
  if (off) cfg.off = off.slice(0, 16);
  const r = await api.createWidget(dashboardId, { kind, pin: pin.slice(0, 40), config: JSON.stringify(cfg) });
  if (!r.ok) return { error: r.error.message };
  revalidatePath(`/dashboards/${dashboardId}`);
  return { error: undefined as string | undefined };
}
