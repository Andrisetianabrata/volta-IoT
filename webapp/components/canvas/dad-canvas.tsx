"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Responsive, noCompactor, useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Eye,
  GripVertical,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GaugeWidget,
  HistoryChartWidget,
  LabeledValueWidget,
  LcdWidget,
  LedWidget,
  LevelWidget,
  TerminalWidget,
} from "@/components/widgets/blynk/displays";
import {
  HSliderWidget,
  JoystickWidget,
  PushButtonWidget,
  RtcWidget,
  StepWidget,
  StyledButtonWidget,
  TimerWidget,
  VSliderWidget,
  ZeRGBaWidget,
} from "@/components/widgets/blynk/controllers";
import { PushWidget } from "@/components/widgets/blynk/notify";
import { AppTabsWidget, MenuWidget, TableWidget } from "@/components/widgets/blynk/iface";
import { BleWidget, BridgeWidget, WebhookWidget } from "@/components/widgets/blynk/others";
import { MicroLabel, PebbleCard } from "@/components/widgets/pebble";
import { StatusChip } from "@/components/widgets/bits";
import {
  WIDGET_KINDS,
  WIDGET_REGISTRY,
  type WidgetCategory,
  type WidgetKind,
} from "@/lib/widget-registry";
import { HtmlWidget, type CmdEvent } from "./html-widget";

const DadMap = dynamic(() => import("@/components/widgets/blynk/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground">
      Memuat peta…
    </div>
  ),
});

const LS_KEY = "volta-dad-v3";
const COLS_LG = 12;
const PLACEHOLDER_PREFIX = "__dropping";

/** Ukuran kanvas per kind (sel grid 12 kolom). */
const CANVAS_SIZE: Record<WidgetKind, { w: number; h: number; minW: number; minH: number }> = {
  button: { w: 3, h: 4, minW: 2, minH: 3 },
  "styled-button": { w: 3, h: 4, minW: 2, minH: 3 },
  slider: { w: 4, h: 3, minW: 2, minH: 3 },
  vslider: { w: 2, h: 4, minW: 2, minH: 3 },
  step: { w: 3, h: 3, minW: 2, minH: 3 },
  joystick: { w: 3, h: 5, minW: 2, minH: 4 },
  zergba: { w: 4, h: 5, minW: 2, minH: 4 },
  timer: { w: 4, h: 6, minW: 3, minH: 4 },
  rtc: { w: 3, h: 3, minW: 2, minH: 2 },
  "labeled-value": { w: 4, h: 4, minW: 2, minH: 3 },
  led: { w: 3, h: 3, minW: 2, minH: 3 },
  gauge: { w: 4, h: 6, minW: 3, minH: 4 },
  lcd: { w: 4, h: 3, minW: 3, minH: 2 },
  "history-chart": { w: 8, h: 4, minW: 4, minH: 3 },
  terminal: { w: 4, h: 5, minW: 3, minH: 4 },
  level: { w: 4, h: 3, minW: 2, minH: 3 },
  push: { w: 4, h: 5, minW: 3, minH: 4 },
  tabs: { w: 4, h: 3, minW: 2, minH: 2 },
  menu: { w: 3, h: 3, minW: 2, minH: 2 },
  table: { w: 8, h: 4, minW: 4, minH: 3 },
  map: { w: 8, h: 6, minW: 4, minH: 3 },
  bridge: { w: 4, h: 6, minW: 3, minH: 4 },
  webhook: { w: 4, h: 5, minW: 3, minH: 4 },
  ble: { w: 4, h: 4, minW: 3, minH: 3 },
  html: { w: 5, h: 5, minW: 3, minH: 3 },
};

const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  controllers: "Controllers",
  displays: "Displays",
  notifications: "Notifications",
  interface: "Interface",
  others: "Others",
};

interface Placed {
  id: string;
  kind: WidgetKind;
}

type Rect = { x: number; y: number; w: number; h: number };

function collides(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hasCollision(layout: Layout): boolean {
  const items = [...layout];
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const A = items[a] as LayoutItem;
      const B = items[b] as LayoutItem;
      if (collides(A, B)) return true;
    }
  }
  return false;
}

/** Petak bebas pertama untuk ukuran w×h. */
function freeSpot(entries: Rect[], w: number, h: number): { x: number; y: number } {
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x + w <= COLS_LG; x++) {
      const rect = { x, y, w, h };
      if (!entries.some((o) => collides(rect, o))) return { x, y };
    }
  }
  const maxY = entries.reduce((m, o) => Math.max(m, o.y + o.h), 0);
  return { x: 0, y: maxY };
}

// Aturan kanvas: widget tidak boleh saling menumpuk — berlaku saat
// drag maupun resize, bukan hanya saat drop.
const noOverlap = {
  name: "no-overlap",
  constrainPosition(
    item: LayoutItem,
    x: number,
    y: number,
    context: { layout: Layout },
  ) {
    const hit = context.layout.some(
      (o) =>
        o.i !== item.i &&
        !o.i.startsWith(PLACEHOLDER_PREFIX) &&
        x < o.x + o.w &&
        x + item.w > o.x &&
        y < o.y + o.h &&
        y + item.h > o.y,
    );
    if (!hit) return { x, y };
    const cur = context.layout.find((o) => o.i === item.i);
    return cur ? { x: cur.x, y: cur.y } : { x, y };
  },
  constrainSize(
    item: LayoutItem,
    w: number,
    h: number,
    _handle: unknown,
    context: { layout: Layout },
  ) {
    const hit = context.layout.some(
      (o) =>
        o.i !== item.i &&
        !o.i.startsWith(PLACEHOLDER_PREFIX) &&
        item.x < o.x + o.w &&
        item.x + w > o.x &&
        item.y < o.y + o.h &&
        item.y + h > o.y,
    );
    if (!hit) return { w, h };
    return { w: item.w, h: item.h };
  },
};

function Grip({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <div className="dad-grip absolute inset-x-3 top-3 z-[1001] flex h-11 cursor-grab touch-none items-center gap-2 rounded-2xl bg-[#111111]/85 px-3 text-white backdrop-blur active:cursor-grabbing dark:bg-white/85 dark:text-black [touch-action:none]">
      <GripVertical className="size-4 shrink-0" />
      <span className="truncate text-xs font-bold">{label}</span>
      <button
        type="button"
        aria-label={`Hapus ${label}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-black/10"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/** Renderer konten murni per kind (tanpa gagang). */
function CanvasWidget({
  kind,
  live,
  onCmd,
}: {
  kind: WidgetKind;
  live: { pin: string; value: string } | null;
  onCmd: (e: CmdEvent) => void;
}) {
  switch (kind) {
    case "button":
      return <PushButtonWidget />;
    case "styled-button":
      return <StyledButtonWidget />;
    case "slider":
      return <HSliderWidget />;
    case "vslider":
      return <VSliderWidget />;
    case "step":
      return <StepWidget />;
    case "joystick":
      return <JoystickWidget />;
    case "zergba":
      return <ZeRGBaWidget />;
    case "timer":
      return <TimerWidget />;
    case "rtc":
      return <RtcWidget />;
    case "labeled-value":
      return <LabeledValueWidget />;
    case "led":
      return <LedWidget />;
    case "gauge":
      return <GaugeWidget />;
    case "lcd":
      return <LcdWidget />;
    case "history-chart":
      return <HistoryChartWidget />;
    case "terminal":
      return <TerminalWidget />;
    case "level":
      return <LevelWidget />;
    case "push":
      return <PushWidget />;
    case "tabs":
      return <AppTabsWidget />;
    case "menu":
      return <MenuWidget />;
    case "table":
      return <TableWidget />;
    case "bridge":
      return <BridgeWidget />;
    case "webhook":
      return <WebhookWidget />;
    case "ble":
      return <BleWidget />;
    case "html":
      return <HtmlWidget live={live} onCmd={onCmd} />;
    case "map":
      return (
        <PebbleCard className="h-full !p-3">
          <div className="h-full min-h-0 overflow-hidden rounded-2xl">
            <DadMap className="h-full w-full" />
          </div>
        </PebbleCard>
      );
  }
}

/** Pratinjau aktual (komponen asli, non-interaktif, diperkecil). */
function WidgetPreview({ kind }: { kind: WidgetKind }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none h-[110px] select-none overflow-hidden rounded-xl"
    >
      <div style={{ zoom: 0.5 }}>
        <div className="h-[220px]">
          <CanvasWidget kind={kind} live={null} onCmd={() => {}} />
        </div>
      </div>
    </div>
  );
}

function loadSaved(): { items: Placed[]; layouts: ResponsiveLayouts } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { items: Placed[]; layouts: ResponsiveLayouts };
    if (Array.isArray(saved.items)) return saved;
  } catch {
    /* mulai kosong */
  }
  return null;
}

// Kanvas kosong ala Blynk: tambah widget dari Widget Box (drag / sentuh /
// double-click), grid terlihat, scroll saat konten melebihi kanvas.
export function DadCanvas() {
  const { width, containerRef, mounted } = useContainerWidth();
  const [edit, setEdit] = useState(true);
  const [items, setItems] = useState<Placed[]>(() => loadSaved()?.items ?? []);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => loadSaved()?.layouts ?? {});
  const [feed, setFeed] = useState<CmdEvent[]>([]);
  const [live, setLive] = useState<{ pin: string; value: string } | null>(null);
  const cleanRef = useRef<{ items: Placed[]; layouts: ResponsiveLayouts } | null>(null);
  const kindRef = useRef<WidgetKind | null>(null);
  const idRef = useRef(0);

  // Layout efektif: pastikan tiap item punya entri sel (anti-tumpuk saat tambah).
  const effectiveLayouts = useMemo<ResponsiveLayouts>(() => {
    const lg = [...(((layouts.lg ?? []) as Layout).filter(
      (l) => !(l as LayoutItem).i.startsWith(PLACEHOLDER_PREFIX),
    ))];
    for (const w of items) {
      if (!lg.some((l) => (l as LayoutItem).i === w.id)) {
        const s = CANVAS_SIZE[w.kind];
        const spot = freeSpot(lg as Rect[], s.w, s.h);
        lg.push({ i: w.id, x: spot.x, y: spot.y, w: s.w, h: s.h, minW: s.minW, minH: s.minH });
      }
    }
    return { ...layouts, lg };
  }, [items, layouts]);

  const persist = useCallback((nextItems: Placed[], nextLayouts: ResponsiveLayouts) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ items: nextItems, layouts: nextLayouts }));
    } catch {
      /* abaikan */
    }
  }, []);

  // Suhu simulasi untuk bridge pin → widget HTML.
  useEffect(() => {
    const id = setInterval(() => {
      const v = 24.5 + Math.sin(Date.now() / 8000) * 1.2;
      setLive({ pin: "temp", value: v.toFixed(1) });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const onCmd = useCallback((e: CmdEvent) => {
    setFeed((f) => [e, ...f].slice(0, 8));
  }, []);

  const addWidget = useCallback(
    (kind: WidgetKind, at?: { x: number; y: number }) => {
      const s = CANVAS_SIZE[kind];
      const id = `${kind}-${Date.now()}-${idRef.current++}`;
      const lg = [...(((layouts.lg ?? []) as Layout).filter(
        (l) => !(l as LayoutItem).i.startsWith(PLACEHOLDER_PREFIX),
      ))] as LayoutItem[];
      const spot = at ?? freeSpot(lg, s.w, s.h);
      const x = Math.max(0, Math.min(spot.x, COLS_LG - s.w));
      const entry: LayoutItem = {
        i: id,
        x,
        y: Math.max(0, spot.y),
        w: s.w,
        h: s.h,
        minW: s.minW,
        minH: s.minH,
      };
      const rects = lg.filter((l) => l.i !== id);
      if (rects.some((o) => collides(entry, o))) {
        const alt = freeSpot(rects, s.w, s.h);
        entry.x = alt.x;
        entry.y = alt.y;
      }
      const nextItems = [...items, { id, kind }];
      const nextLayouts: ResponsiveLayouts = { ...layouts, lg: [...lg, entry] };
      setItems(nextItems);
      setLayouts(nextLayouts);
      cleanRef.current = { items: nextItems, layouts: nextLayouts };
      persist(nextItems, nextLayouts);
    },
    [items, layouts, persist],
  );

  const removeWidget = useCallback(
    (id: string) => {
      const nextItems = items.filter((w) => w.id !== id);
      const lg = [...((layouts.lg ?? []) as Layout)].filter((l) => (l as LayoutItem).i !== id);
      const nextLayouts: ResponsiveLayouts = { ...layouts, lg };
      setItems(nextItems);
      setLayouts(nextLayouts);
      cleanRef.current = { items: nextItems, layouts: nextLayouts };
      persist(nextItems, nextLayouts);
    },
    [items, layouts, persist],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Widget Box: pratinjau aktual + drag / sentuh / double-click */}
      <PebbleCard className="h-fit lg:sticky lg:top-5 lg:max-h-[78vh] lg:overflow-auto">
        <MicroLabel>Widget box</MicroLabel>
        <p className="mt-1 text-xs text-muted-foreground">
          Seret ke kanvas, atau klik ganda untuk tambah.
        </p>
        <div className="mt-3 space-y-4">
          {(Object.keys(CATEGORY_LABEL) as WidgetCategory[]).map((cat) => (
            <div key={cat}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {CATEGORY_LABEL[cat]}
              </p>
              <div className="space-y-2">
                {WIDGET_KINDS.filter((k) => WIDGET_REGISTRY[k].category === cat).map((kind) => (
                  <div
                    key={kind}
                    role="button"
                    tabIndex={0}
                    aria-label={`Tambah ${WIDGET_REGISTRY[kind].title}`}
                    draggable
                    data-rgl-draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", kind);
                      e.dataTransfer.effectAllowed = "copy";
                      kindRef.current = kind;
                    }}
                    onTouchStart={() => {
                      kindRef.current = kind;
                    }}
                    onDoubleClick={() => addWidget(kind)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addWidget(kind);
                    }}
                    className="cursor-grab rounded-2xl bg-black/[0.03] p-2 transition-colors hover:bg-black/[0.07] active:cursor-grabbing dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
                  >
                    <WidgetPreview kind={kind} />
                    <p className="flex items-center gap-1.5 px-1 pt-1.5 pb-0.5 text-[13px] font-semibold">
                      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                      {WIDGET_REGISTRY[kind].title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PebbleCard>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-black/[0.06] p-1 dark:bg-white/10">
            <Button
              size="sm"
              onClick={() => setEdit(false)}
              aria-pressed={!edit}
              className={
                !edit
                  ? "rounded-full bg-white shadow dark:bg-[#1e1e22]"
                  : "rounded-full bg-transparent text-muted-foreground shadow-none hover:bg-transparent"
              }
            >
              <Eye className="size-4" /> Lihat
            </Button>
            <Button
              size="sm"
              onClick={() => setEdit(true)}
              aria-pressed={edit}
              className={
                edit
                  ? "rounded-full bg-white shadow dark:bg-[#1e1e22]"
                  : "rounded-full bg-transparent text-muted-foreground shadow-none hover:bg-transparent"
              }
            >
              <Pencil className="size-4" /> Ubah
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              setItems([]);
              setLayouts({});
              cleanRef.current = null;
            }}
            className="rounded-full"
          >
            <RotateCcw className="size-4" /> Kosongkan
          </Button>
          <StatusChip tone="copper">demo lokal · belum ke server</StatusChip>
        </div>

        {/* Kanvas: tinggi tetap, scroll saat konten melebihi */}
        <div className="mt-4 h-[68vh] min-h-[480px] overflow-auto rounded-[28px] border border-black/[0.06] bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div
            ref={containerRef}
            className="min-h-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(17,17,17,0.14) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          >
            {mounted && (
              <Responsive
                layouts={effectiveLayouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={44}
                margin={[12, 12]}
                width={width}
                compactor={noCompactor}
                constraints={[noOverlap]}
                dragConfig={{ enabled: edit, bounded: false, threshold: 3, handle: ".dad-grip" }}
                resizeConfig={{ enabled: edit, handles: ["se"] }}
                dropConfig={{
                  enabled: true,
                  defaultItem: { w: 2, h: 2 },
                  onDragOver: () => {
                    const k = kindRef.current;
                    return k
                      ? { w: CANVAS_SIZE[k].w, h: CANVAS_SIZE[k].h }
                      : undefined;
                  },
                }}
                onDrop={(_layout, item) => {
                  const kind = kindRef.current;
                  kindRef.current = null;
                  if (!kind || !item) return;
                  const s = CANVAS_SIZE[kind];
                  addWidget(kind, {
                    x: Math.max(0, Math.min(item.x, COLS_LG - s.w)),
                    y: Math.max(0, item.y),
                  });
                }}
                onLayoutChange={(cur, all) => {
                  const clean = (all.lg ?? []) as Layout;
                  const stripped = clean.filter(
                    (l) => !(l as LayoutItem).i.startsWith(PLACEHOLDER_PREFIX),
                  );
                  const next = { ...all, lg: stripped };
                  setLayouts(next);
                  if (!hasCollision(stripped)) {
                    cleanRef.current = { items, layouts: next };
                    if (edit) persist(items, next);
                  }
                }}
                onDragStop={(cur) => {
                  if (hasCollision(cur) && cleanRef.current) {
                    setItems(cleanRef.current.items);
                    setLayouts(cleanRef.current.layouts);
                  }
                }}
                onResizeStop={(cur) => {
                  if (hasCollision(cur) && cleanRef.current) {
                    setItems(cleanRef.current.items);
                    setLayouts(cleanRef.current.layouts);
                  }
                }}
              >
                {items.map((w) => (
                  <div key={w.id} className="h-full">
                    <div className="relative h-full">
                      {edit && (
                        <Grip
                          label={WIDGET_REGISTRY[w.kind].title}
                          onDelete={() => removeWidget(w.id)}
                        />
                      )}
                      <CanvasWidget kind={w.kind} live={live} onCmd={onCmd} />
                    </div>
                  </div>
                ))}
              </Responsive>
            )}
            {items.length === 0 && (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
                <p className="flex items-center gap-2 text-xl font-bold">
                  <MousePointerClick className="size-5" /> Add new widget
                </p>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  <b>Double click</b> the widget on the left or <b>drag</b> it to the canvas
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <PebbleCard>
            <MicroLabel>Bridge postMessage · widget → induk</MicroLabel>
            {feed.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Tekan tombol di widget HTML — perintah muncul di sini.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 font-mono text-xs tabular-nums">
                {feed.map((e, i) => (
                  <li
                    key={`${e.at}-${i}`}
                    className="flex justify-between rounded-xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]"
                  >
                    <span>
                      cmd <b>{e.pin}</b> = <b>{e.value}</b>
                    </span>
                    <span className="text-muted-foreground">{e.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </PebbleCard>
          <PebbleCard>
            <MicroLabel>Cara pakai kanvas ini</MicroLabel>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Kanvas mulai kosong — tambah dari Widget Box (seret, sentuh, atau klik ganda).</li>
              <li>Mode Ubah: seret gagang tiap widget untuk pindah petak; × untuk hapus.</li>
              <li>Tarik gagang sudut kanan-bawah untuk ubah ukuran.</li>
              <li>Widget tidak bisa bertumpuk; kanvas scroll bila konten melebihi.</li>
              <li>Mode Lihat: kunci semua gagang agar aman di-scroll.</li>
            </ul>
          </PebbleCard>
        </div>
      </div>
    </div>
  );
}
