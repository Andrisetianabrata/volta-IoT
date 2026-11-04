import { apiBase, sessionToken, type UpstreamError } from "./auth";

/* Klien API server untuk Server Component / Server Action. Token diambil
   dari cookie httpOnly, tidak pernah ke browser. */

export type Device = { id: string; name: string };
export type DeviceStatus = { online: boolean; updated_at: number | null };
export type PinState = { device_id: string; pin: string; value: string; updated_at: number };
export type HistoryPoint = { device_id: string; pin: string; value: string; ts: number };
export type Dashboard = { id: string; name: string };
export type Widget = { id: string; dashboard_id: string; kind: string; pin: string; config: string };

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; status: number; error: UpstreamError };
export type ApiResult<T> = ApiOk<T> | ApiFail;

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  const token = await sessionToken();
  if (!token) return { ok: false, status: 401, error: { code: "NO_SESSION", message: "Belum masuk." } };
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      method: init?.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: { code: "UPSTREAM_DOWN", message: "Server tidak terjangkau." } };
  }
  let json: unknown = null;
  try {
    json = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json as { error?: UpstreamError } | null)?.error;
    return { ok: false, status: res.status, error: err ?? { code: "UPSTREAM", message: `Server menjawab ${res.status}.` } };
  }
  return { ok: true, data: json as T };
}

export const api = {
  dashboards: () => call<Dashboard[]>("/dashboards"),
  createDashboard: (name: string) => call<{ id: string }>("/dashboards", { method: "POST", body: { name } }),
  deleteDashboard: (id: string) => call<{ ok: boolean }>(`/dashboards/${encodeURIComponent(id)}`, { method: "DELETE" }),
  dashboard: (id: string) => call<Dashboard>(`/dashboards/${encodeURIComponent(id)}`),
  widgets: (id: string) => call<Widget[]>(`/dashboards/${encodeURIComponent(id)}/widgets`),
  createWidget: (id: string, body: { kind: string; pin: string; config: string }) =>
    call<{ id: string }>(`/dashboards/${encodeURIComponent(id)}/widgets`, { method: "POST", body }),
  devices: () => call<Device[]>("/devices"),
  createDevice: (name: string) => call<{ device_id: string; token: string }>("/devices", { method: "POST", body: { name } }),
  deleteDevice: (id: string) => call<{ ok: boolean }>(`/devices/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deviceStatus: (id: string) => call<DeviceStatus>(`/devices/${encodeURIComponent(id)}/status`),
  pins: (id: string) => call<PinState[]>(`/devices/${encodeURIComponent(id)}/pins`),
  history: (id: string, pin: string, from: number, to: number, limit = 500) =>
    call<HistoryPoint[]>(`/devices/${encodeURIComponent(id)}/history/${encodeURIComponent(pin)}?from=${from}&to=${to}&limit=${limit}`),
  sendPin: (id: string, pin: string, value: string) =>
    call<{ ok: boolean }>(`/devices/${encodeURIComponent(id)}/pins/${encodeURIComponent(pin)}`, {
      method: "PUT",
      body: { value },
    }),
};
