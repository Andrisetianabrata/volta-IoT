"use client";

import { useState } from "react";
import { Droplets, Minus, Plus, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MicroLabel, PebbleCard } from "./pebble";

// Climate slider card: setpoint stepper + two sub-tiles.
export function ClimateSliderCard() {
  const [temp, setTemp] = useState([22]);

  return (
    <PebbleCard className="flex h-full flex-col items-center text-center">
      <p className="text-5xl font-medium tracking-tight tabular-nums">
        {temp[0]}°C
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        Interior 18°C · Exterior −2°C
      </p>

      <div className="mt-5 flex w-full items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Decrease setpoint"
          onClick={() => setTemp(([v]) => [Math.max(16, v - 1)])}
          className="size-10 shrink-0 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Minus className="size-4" />
        </Button>
        <Slider
          value={temp}
          onValueChange={(v) => setTemp(v as number[])}
          min={16}
          max={30}
          step={1}
          aria-label="Temperature setpoint"
          className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-black/[0.08] [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-4 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-thumb]]:shadow-md dark:[&_[data-slot=slider-track]]:bg-white/15"
        />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Increase setpoint"
          onClick={() => setTemp(([v]) => [Math.min(30, v + 1)])}
          className="size-10 shrink-0 rounded-full bg-black/[0.06] hover:bg-black/10 dark:bg-white/10"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left">
        <div className="rounded-2xl bg-black/[0.04] p-3.5 dark:bg-white/[0.06]">
          <MicroLabel>Cabin humidity</MicroLabel>
          <p className="mt-1 flex items-center justify-between text-lg font-bold tabular-nums">
            42%
            <Droplets className="size-4 text-muted-foreground" />
          </p>
        </div>
        <div className="rounded-2xl bg-black/[0.04] p-3.5 dark:bg-white/[0.06]">
          <MicroLabel>Air quality</MicroLabel>
          <p className="mt-1 flex items-center justify-between text-lg font-bold">
            Good
            <Wind className="size-4 text-muted-foreground" />
          </p>
        </div>
      </div>
    </PebbleCard>
  );
}
