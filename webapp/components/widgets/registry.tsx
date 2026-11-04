"use client";

import type { Widget } from "@/lib/api";
import { WidgetCard } from "./card";
import { GaugeWidget } from "./gauge";
import { LabeledValueWidget } from "./labeled-value";
import { LedWidget } from "./led";
import { CommandButtonWidget } from "./command-button";
import { CommandSwitchWidget } from "./command-switch";
import { CommandSliderWidget } from "./command-slider";
import { HistoryChartWidget } from "./history-chart";

/* Registry kind widget (W10). Kind tak dikenal tampil kartu jujur,
   bukan crash. Ukuran default dari manifest untuk editor kelak (W12).
   Konvensi config: {device, label, unit?, min?, max?, on?, off?,
   x?, y?, w?, h?} — device milik tiap widget, bukan milik kanvas. */

export type WidgetProps = {
  widget: Widget;
  value?: string;
  onCommand: (deviceId: string, pin: string, value: string) => Promise<{ error?: string }>;
};

function UnsupportedKind({ widget }: { widget: Widget }) {
  return (
    <WidgetCard title={`${widget.kind} . ${widget.pin}`} meta="belum didukung">
      <p className="text-[15px] leading-relaxed text-[var(--color-muted)]">
        Kind widget ini belum bisa ditampilkan. Definisinya tetap tersimpan dan tidak dihapus.
      </p>
    </WidgetCard>
  );
}

const KINDS: Record<string, (p: WidgetProps) => React.JSX.Element> = {
  gauge: GaugeWidget,
  "labeled-value": LabeledValueWidget,
  led: LedWidget,
  button: CommandButtonWidget,
  switch: CommandSwitchWidget,
  slider: CommandSliderWidget,
  "history-chart": HistoryChartWidget,
};

export function WidgetView(props: WidgetProps) {
  const Render = KINDS[props.widget.kind];
  if (!Render) return <UnsupportedKind widget={props.widget} />;
  return <Render {...props} />;
}

export const WIDGET_MANIFEST = [
  { kind: "gauge", title: "Gauge", w: 4, h: 1 },
  { kind: "labeled-value", title: "Nilai berlabel", w: 4, h: 1 },
  { kind: "led", title: "LED", w: 2, h: 1 },
  { kind: "button", title: "Tombol", w: 2, h: 1 },
  { kind: "switch", title: "Saklar", w: 2, h: 1 },
  { kind: "slider", title: "Geser", w: 4, h: 1 },
  { kind: "history-chart", title: "Grafik history", w: 8, h: 2 },
] as const;
