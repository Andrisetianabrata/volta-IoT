"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { BlynkCard } from "./shell";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 w-full items-center justify-center gap-2 bg-black/[0.04] text-sm text-muted-foreground dark:bg-white/[0.06]">
      <MapPin className="size-4" /> Loading map…
    </div>
  ),
});

// Map (Leaflet + OpenStreetMap): live GPS point preview.
export function MapWidget() {
  return (
    <BlynkCard name="Map · leaflet" pin="gps" className="md:col-span-2">
      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <LeafletMap />
      </div>
      <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
        −6.2088, 106.8456 · HDOP 0.9
      </p>
    </BlynkCard>
  );
}

// Tabs: multi-page container.
export function AppTabsWidget() {
  return (
    <BlynkCard name="Tabs" pin="—">
      <Tabs defaultValue="home">
        <TabsList className="h-10 w-full rounded-full bg-black/[0.06] p-1 dark:bg-white/10">
          {["home", "sensors", "log"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="h-full flex-1 rounded-full text-[13px] font-semibold capitalize data-active:bg-white data-active:shadow dark:data-active:bg-[#1e1e22]"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="home" className="pt-3 text-sm">
          Climate overview page.
        </TabsContent>
        <TabsContent value="sensors" className="pt-3 text-sm">
          All sensor tiles page.
        </TabsContent>
        <TabsContent value="log" className="pt-3 text-sm">
          Event log page.
        </TabsContent>
      </Tabs>
    </BlynkCard>
  );
}

// Menu: dropdown pin selector.
export function MenuWidget() {
  const [v, setV] = useState("tomat");
  return (
    <BlynkCard name="Menu" pin="plot">
      <Label htmlFor="plot-menu">Active plot</Label>
      <Select value={v} onValueChange={(nv) => setV(nv ?? "tomat")}>
        <SelectTrigger id="plot-menu" className="mt-1.5 h-11 rounded-2xl">
          <SelectValue placeholder="Pick a plot" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="tomat">Tomat — bed A</SelectItem>
          <SelectItem value="cabai">Cabai — bed B</SelectItem>
          <SelectItem value="selada">Selada — rack C</SelectItem>
        </SelectContent>
      </Select>
      <p className="mt-2 text-xs text-muted-foreground">
        Sends index 1–3 to hardware on select.
      </p>
    </BlynkCard>
  );
}

// Table: recent readings.
export function TableWidget() {
  const rows = [
    { t: "12:00", pin: "V10", val: "24.8 °C" },
    { t: "11:55", pin: "V12", val: "68 %" },
    { t: "11:50", pin: "V16", val: "7/10" },
    { t: "11:45", pin: "V11", val: "ON" },
  ];
  return (
    <BlynkCard name="Table" pin="multi" className="md:col-span-2">
      <Table>
        <TableHeader>
          <TableRow className="border-black/[0.06] hover:bg-transparent dark:border-white/10">
            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</TableHead>
            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pin</TableHead>
            <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.t + r.pin}
              className="border-black/[0.06] hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/[0.04]"
            >
              <TableCell className="tabular-nums">{r.t}</TableCell>
              <TableCell className="font-mono">{r.pin}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{r.val}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </BlynkCard>
  );
}
