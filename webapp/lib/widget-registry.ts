// Registry kind widget kanvas VOLTA. — perluasan W10.
// Satu kind = satu renderer klien + satu skema config JSON.
// Server menyimpan kind/config opak (validasi: JSON valid, <= 64 KB);
// file ini satu-satunya sumber kebenaran klien.

export const MAX_WIDGET_CONFIG_LEN = 65536;

export type WidgetCategory =
  | "controllers"
  | "displays"
  | "notifications"
  | "interface"
  | "others";

export type ConfigFieldType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "code";

export interface ConfigField {
  type: ConfigFieldType;
  label: string;
  def?: string | number | boolean;
  options?: string[];
  maxLen?: number;
}

export type WidgetKind =
  | "button"
  | "styled-button"
  | "slider"
  | "vslider"
  | "step"
  | "joystick"
  | "zergba"
  | "timer"
  | "rtc"
  | "labeled-value"
  | "led"
  | "gauge"
  | "lcd"
  | "history-chart"
  | "terminal"
  | "level"
  | "push"
  | "tabs"
  | "menu"
  | "table"
  | "map"
  | "bridge"
  | "webhook"
  | "ble"
  | "html";

export interface WidgetManifest {
  kind: WidgetKind;
  title: string;
  category: WidgetCategory;
  /** Peran pin: berapa pin dibaca/ditulis dan untuk apa. */
  pins: string;
  defaultSize: { w: number; h: number };
  config: Record<string, ConfigField>;
}

function withLayout(
  fields: Record<string, ConfigField>,
  w: number,
  h: number,
): Record<string, ConfigField> {
  return {
    ...fields,
    x: { type: "number", label: "Grid X", def: 0 },
    y: { type: "number", label: "Grid Y", def: 0 },
    w: { type: "number", label: "Grid W", def: w },
    h: { type: "number", label: "Grid H", def: h },
  };
}

const DEVICE_LABEL = {
  device: { type: "string", label: "Device ID" } as ConfigField,
  label: { type: "string", label: "Label", def: "" } as ConfigField,
};

export const WIDGET_REGISTRY: Record<WidgetKind, WidgetManifest> = {
  button: {
    kind: "button", title: "Button · push", category: "controllers",
    pins: "tulis 1 pin (1 saat ditekan, 0 saat dilepas)",
    defaultSize: { w: 2, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, on: { type: "string", label: "Nilai ON", def: "1" }, off: { type: "string", label: "Nilai OFF", def: "0" } }, 2, 1),
  },
  "styled-button": {
    kind: "styled-button", title: "Styled button · switch", category: "controllers",
    pins: "tulis 1 pin (toggle 1/0)",
    defaultSize: { w: 2, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, on: { type: "string", label: "Nilai ON", def: "1" }, off: { type: "string", label: "Nilai OFF", def: "0" } }, 2, 1),
  },
  slider: {
    kind: "slider", title: "Slider", category: "controllers",
    pins: "tulis 1 pin numerik",
    defaultSize: { w: 4, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, min: { type: "number", label: "Min", def: 0 }, max: { type: "number", label: "Max", def: 100 }, unit: { type: "string", label: "Unit", def: "" } }, 4, 1),
  },
  vslider: {
    kind: "vslider", title: "Slider · vertical", category: "controllers",
    pins: "tulis 1 pin numerik",
    defaultSize: { w: 2, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, min: { type: "number", label: "Min", def: 0 }, max: { type: "number", label: "Max", def: 100 } }, 2, 2),
  },
  step: {
    kind: "step", title: "Step control", category: "controllers",
    pins: "tulis 1 pin numerik",
    defaultSize: { w: 2, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, step: { type: "number", label: "Step", def: 1 }, min: { type: "number", label: "Min", def: 0 }, max: { type: "number", label: "Max", def: 10 } }, 2, 1),
  },
  joystick: {
    kind: "joystick", title: "Joystick", category: "controllers",
    pins: "tulis 2 pin (X −100…100, Y −100…100)",
    defaultSize: { w: 2, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, pinY: { type: "string", label: "Pin Y", def: "joy_y" } }, 2, 2),
  },
  zergba: {
    kind: "zergba", title: "zeRGBa", category: "controllers",
    pins: "tulis 1 pin string r,g,b atau 3 pin",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL }, 3, 2),
  },
  timer: {
    kind: "timer", title: "Timer", category: "controllers",
    pins: "tulis 1 pin aksi pada jadwal",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, action: { type: "string", label: "Nilai aksi", def: "1" }, days: { type: "string", label: "Hari (csv)", def: "S,S,R,K,J,S,M" } }, 3, 2),
  },
  rtc: {
    kind: "rtc", title: "RTC", category: "controllers",
    pins: "baca jam device (butuh endpoint sync)",
    defaultSize: { w: 2, h: 1 },
    config: withLayout({ ...DEVICE_LABEL }, 2, 1),
  },
  "labeled-value": {
    kind: "labeled-value", title: "Value display", category: "displays",
    pins: "baca 1 pin",
    defaultSize: { w: 4, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, unit: { type: "string", label: "Unit", def: "" } }, 4, 1),
  },
  led: {
    kind: "led", title: "LED", category: "displays",
    pins: "baca 1 pin (0/1)",
    defaultSize: { w: 2, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, color: { type: "color", label: "Warna", def: "#C07A24" } }, 2, 1),
  },
  gauge: {
    kind: "gauge", title: "Gauge", category: "displays",
    pins: "baca 1 pin numerik",
    defaultSize: { w: 4, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, min: { type: "number", label: "Min", def: 0 }, max: { type: "number", label: "Max", def: 100 }, unit: { type: "string", label: "Unit", def: "%" } }, 4, 2),
  },
  lcd: {
    kind: "lcd", title: "LCD", category: "displays",
    pins: "baca 1–2 pin baris teks",
    defaultSize: { w: 4, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, pin2: { type: "string", label: "Pin baris 2", def: "" }, cols: { type: "number", label: "Kolom", def: 16 } }, 4, 1),
  },
  "history-chart": {
    kind: "history-chart", title: "SuperChart", category: "displays",
    pins: "baca history 1 pin",
    defaultSize: { w: 8, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, unit: { type: "string", label: "Unit", def: "" }, range: { type: "select", label: "Rentang", def: "24H", options: ["1H", "24H"] } }, 8, 2),
  },
  terminal: {
    kind: "terminal", title: "Terminal", category: "displays",
    pins: "tulis perintah + baca balasan 1 pin",
    defaultSize: { w: 4, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, baud: { type: "number", label: "Baud (info)", def: 115200 } }, 4, 2),
  },
  level: {
    kind: "level", title: "Level", category: "displays",
    pins: "baca 1 pin numerik",
    defaultSize: { w: 4, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, max: { type: "number", label: "Skala", def: 10 } }, 4, 1),
  },
  push: {
    kind: "push", title: "Notification · push", category: "notifications",
    pins: "dipicu 1 pin (butuh endpoint rules)",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, op: { type: "select", label: "Operator", def: "lt", options: ["gt", "gte", "lt", "lte", "eq", "changed"] }, threshold: { type: "number", label: "Ambang", def: 2 }, message: { type: "string", label: "Pesan", def: "" } }, 3, 2),
  },
  tabs: {
    kind: "tabs", title: "Tabs", category: "interface",
    pins: "tanpa pin (navigasi board)",
    defaultSize: { w: 4, h: 1 },
    config: withLayout({ pages: { type: "string", label: "Halaman (csv)", def: "home,sensors,log" } }, 4, 1),
  },
  menu: {
    kind: "menu", title: "Menu", category: "interface",
    pins: "tulis 1 pin (index opsi)",
    defaultSize: { w: 3, h: 1 },
    config: withLayout({ ...DEVICE_LABEL, options: { type: "string", label: "Opsi (csv)", def: "" } }, 3, 1),
  },
  table: {
    kind: "table", title: "Table", category: "interface",
    pins: "baca N pin (daftar csv)",
    defaultSize: { w: 8, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, pins: { type: "string", label: "Pin (csv)", def: "temp,soil,tank" } }, 8, 2),
  },
  map: {
    kind: "map", title: "Map · leaflet", category: "interface",
    pins: 'baca 1 pin "lat,lon"',
    defaultSize: { w: 8, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, zoom: { type: "number", label: "Zoom", def: 13 } }, 8, 2),
  },
  bridge: {
    kind: "bridge", title: "Bridge", category: "others",
    pins: "teruskan 1 pin ke device lain (butuh API)",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, target: { type: "string", label: "Device tujuan", def: "" }, targetPin: { type: "string", label: "Pin tujuan", def: "" } }, 3, 2),
  },
  webhook: {
    kind: "webhook", title: "Webhook", category: "others",
    pins: "kirim 1 pin ke URL (butuh engine)",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL, url: { type: "string", label: "Endpoint", def: "" }, method: { type: "select", label: "Method", def: "POST", options: ["POST", "PUT"] } }, 3, 2),
  },
  ble: {
    kind: "ble", title: "Bluetooth · BLE", category: "others",
    pins: "lokal via WebBluetooth (tanpa server)",
    defaultSize: { w: 3, h: 2 },
    config: withLayout({ ...DEVICE_LABEL }, 3, 2),
  },
  html: {
    kind: "html", title: "HTML kustom", category: "others",
    pins: "bebas via bridge postMessage",
    defaultSize: { w: 4, h: 2 },
    config: withLayout({
      html: { type: "code", label: "HTML", maxLen: MAX_WIDGET_CONFIG_LEN },
      css: { type: "code", label: "CSS", maxLen: MAX_WIDGET_CONFIG_LEN },
      js: { type: "code", label: "JS", maxLen: MAX_WIDGET_CONFIG_LEN },
    }, 4, 2),
  },
};

export const WIDGET_KINDS = Object.keys(WIDGET_REGISTRY) as WidgetKind[];

/** Manifest atau null untuk kind tak dikenal (kartu jujur W10). */
export function getManifest(kind: string): WidgetManifest | null {
  return (WIDGET_REGISTRY as Record<string, WidgetManifest>)[kind] ?? null;
}

/** Cermin klien dari check_widget_config server + cek field skema. */
export function validateConfig(
  kind: WidgetKind,
  raw: string,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (raw.length > MAX_WIDGET_CONFIG_LEN) {
    errors.push(`config melebihi ${MAX_WIDGET_CONFIG_LEN} byte`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    errors.push("config harus JSON valid");
    return { ok: false, errors };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    errors.push("config harus objek JSON");
    return { ok: false, errors };
  }
  const manifest = WIDGET_REGISTRY[kind];
  const obj = parsed as Record<string, unknown>;
  for (const [key, field] of Object.entries(manifest.config)) {
    const v = obj[key];
    if (v === undefined) continue;
    if (field.type === "number" && typeof v !== "number") {
      errors.push(`${key} harus number`);
    }
    if (
      (field.type === "string" ||
        field.type === "color" ||
        field.type === "code" ||
        field.type === "select") &&
      typeof v !== "string"
    ) {
      errors.push(`${key} harus string`);
    }
    if (field.type === "boolean" && typeof v !== "boolean") {
      errors.push(`${key} harus boolean`);
    }
    if (
      field.type === "select" &&
      field.options &&
      typeof v === "string" &&
      !field.options.includes(v)
    ) {
      errors.push(`${key} harus salah satu: ${field.options.join(", ")}`);
    }
    if (
      (field.type === "code" || field.type === "string") &&
      field.maxLen &&
      typeof v === "string" &&
      v.length > field.maxLen
    ) {
      errors.push(`${key} melebihi ${field.maxLen} byte`);
    }
  }
  return { ok: errors.length === 0, errors };
}
