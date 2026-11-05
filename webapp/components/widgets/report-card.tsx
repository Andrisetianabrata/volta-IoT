"use client";

import { useState } from "react";
import { Bell, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DotMatrix, SegmentedControl, StatusChip } from "./bits";
import { MicroLabel, PebbleCard } from "./pebble";

// Report card: period tabs, two dot-matrix readings.
export function ReportCard() {
  const [period, setPeriod] = useState("weekly");

  return (
    <PebbleCard className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <LayoutGrid className="size-5" />
        <MicroLabel>Report</MicroLabel>
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <Avatar className="size-7">
            <AvatarFallback className="bg-black/[0.07] text-[10px] font-bold dark:bg-white/10">
              VT
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mt-4">
        <SegmentedControl
          ariaLabel="Report period"
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <MicroLabel>Humidity</MicroLabel>
          <StatusChip>Optimal</StatusChip>
        </div>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="text-6xl font-medium tracking-tight tabular-nums">
            47<span className="align-top text-2xl">%</span>
          </p>
          <DotMatrix rows={4} cols={9} filled={period === "weekly" ? 20 : 27} />
        </div>
      </div>

      <Separator className="my-5 bg-black/[0.06] dark:bg-white/10" />

      <div>
        <div className="flex items-center gap-2">
          <MicroLabel>Air quality</MicroLabel>
          <StatusChip>Good</StatusChip>
        </div>
        <div className="mt-1 flex items-end justify-between gap-4">
          <p className="text-6xl font-medium tracking-tight tabular-nums">
            62
            <span className="ml-1 align-top text-sm font-semibold text-muted-foreground">
              AQI
            </span>
          </p>
          <DotMatrix rows={4} cols={9} filled={period === "weekly" ? 24 : 16} />
        </div>
      </div>
    </PebbleCard>
  );
}
