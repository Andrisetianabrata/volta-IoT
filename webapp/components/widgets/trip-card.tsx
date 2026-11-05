"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { MicroLabel, PebbleCard } from "./pebble";

// Trip card: destination, three mini stats, autopilot switch, start.
export function TripCard() {
  const [autopilot, setAutopilot] = useState(false);

  return (
    <PebbleCard className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Way <span className="text-muted-foreground">“Work”</span>
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss"
          className="size-7 rounded-full hover:bg-black/[0.05]"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Time in road", value: "24 min" },
          { label: "Arrival time", value: "12:00" },
          { label: "Distance", value: "2.4 km" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Separator className="my-4 bg-black/[0.06] dark:bg-white/10" />

      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4" /> Autopilot
        </p>
        <Switch
          checked={autopilot}
          onCheckedChange={setAutopilot}
          aria-label="Autopilot"
        />
      </div>

      <Button className="mt-5 h-12 w-full rounded-2xl bg-[#111111] text-[15px] font-semibold text-white hover:bg-black dark:bg-white dark:text-black">
        Start
      </Button>
      <MicroLabel className="mt-3 text-center">Preview state</MicroLabel>
    </PebbleCard>
  );
}
