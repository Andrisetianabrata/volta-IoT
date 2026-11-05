import { BottomNav } from "@/components/widgets/bottom-nav";
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
  AppTabsWidget,
  MapWidget,
  MenuWidget,
  TableWidget,
} from "@/components/widgets/blynk/iface";
import {
  PushWidget,
} from "@/components/widgets/blynk/notify";
import {
  BleWidget,
  BridgeWidget,
  WebhookWidget,
} from "@/components/widgets/blynk/others";
import { ChargeCard } from "@/components/widgets/charge-card";
import { ClimateHero } from "@/components/widgets/climate-hero";
import { ClimateSliderCard } from "@/components/widgets/climate-slider-card";
import { RangeCard } from "@/components/widgets/range-card";
import { ReportCard } from "@/components/widgets/report-card";
import { RoomCard } from "@/components/widgets/room-card";
import { TempDial } from "@/components/widgets/temp-dial";
import { TripCard } from "@/components/widgets/trip-card";
import { ControlRow, DotMatrix, StatusChip } from "@/components/widgets/bits";
import { MicroLabel, PebbleCard } from "@/components/widgets/pebble";
import type { ReactNode } from "react";

function CategorySection({
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export const metadata = {
  title: "Widgets — VOLTA.",
  description: "Pebble widget gallery: static design preview",
};

const PRINCIPLES = [
  "28px radius · hairline border · one soft shadow",
  "Ink numerals (Jost, tabular) · 11px micro labels",
  "Copper = energy / live · ink = primary action",
];

export default function WidgetsPage() {
  return (
    <main className="min-h-screen bg-[#e9e9e7] text-foreground dark:bg-[#0a0a0b]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <MicroLabel>VOLTA. · Widget gallery</MicroLabel>
        <h1 className="mt-2 text-4xl font-medium tracking-tight md:text-5xl">
          Pebble
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Tema soft-minimal bento dari referensi: kartu putih beradius
          besar di atas kanvas abu hangat, angka tinta besar, label mikro
          huruf kapital, aksi pil hitam. Semua widget dibangun dari primitif
          shadcn yang dipasang via CLI lalu didesain ulang di sini.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PRINCIPLES.map((p) => (
            <li
              key={p}
              className="rounded-full border border-black/10 px-3 py-1 text-xs text-muted-foreground dark:border-white/15"
            >
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Angka di galeri ini nilai pratinjau statis, bukan data device.
          Pin = string bebas apa pun (mis. <span className="font-mono">temp</span>,{" "}
          <span className="font-mono">relay</span>, <span className="font-mono">gps</span>) —
          diteruskan opak oleh firmware, MQTT, dan server; awalan{" "}
          <span className="font-mono">V</span> hanya konvensi contoh.
        </p>

        <CategorySection id="controllers" title="Controllers" hint="App → hardware: kirim perintah / data ke device.">
          <PushButtonWidget />
          <StyledButtonWidget />
          <HSliderWidget />
          <VSliderWidget />
          <StepWidget />
          <JoystickWidget />
          <ZeRGBaWidget />
          <TimerWidget />
          <RtcWidget />
        </CategorySection>

        <CategorySection id="displays" title="Displays" hint="Hardware → app: visualisasi data sensor / status.">
          <LabeledValueWidget />
          <LedWidget />
          <GaugeWidget />
          <LcdWidget />
          <HistoryChartWidget />
          <TerminalWidget />
          <LevelWidget />
        </CategorySection>

        <CategorySection id="notifications" title="Notifications" hint="Sistem → pengguna: pesan / peringatan.">
          <PushWidget />
        </CategorySection>

        <CategorySection id="interface" title="Interface" hint="Tata letak: tab, menu, tabel, peta Leaflet.">
          <AppTabsWidget />
          <MenuWidget />
          <TableWidget />
          <MapWidget />
        </CategorySection>

        <CategorySection id="others" title="Others / Device" hint="Bridge antar-device, webhook keluar, BLE lokal.">
          <BridgeWidget />
          <WebhookWidget />
          <BleWidget />
        </CategorySection>

        <h2 className="mt-14 text-2xl font-medium tracking-tight">
          Pebble base set
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:row-span-2">
            <ClimateHero />
          </div>
          <TempDial />
          <ReportCard />
          <RoomCard />
          <TripCard />
          <ChargeCard />
          <ClimateSliderCard />
          <RangeCard />
          <div className="md:col-span-2 xl:col-span-1">
            <BottomNav />
          </div>
          <PebbleCard className="md:col-span-2 xl:col-span-2">
            <MicroLabel>Bits — chip · dot matrix · baris kontrol</MicroLabel>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusChip>Optimal</StatusChip>
              <StatusChip>Good</StatusChip>
              <StatusChip>Parked</StatusChip>
              <StatusChip tone="copper">Charging · live</StatusChip>
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <MicroLabel className="mb-2">Dot matrix</MicroLabel>
                <DotMatrix rows={5} cols={12} filled={34} />
              </div>
              <div className="border-t border-black/[0.06] pt-1 sm:border-t-0 sm:pt-0 dark:border-white/10">
                <ControlRow label="Charge limit" value="80%" />
                <ControlRow label="Tire pressure" value="Normal" />
                <ControlRow label="Driving mode" value="City" />
              </div>
            </div>
          </PebbleCard>
        </div>
      </div>
    </main>
  );
}
