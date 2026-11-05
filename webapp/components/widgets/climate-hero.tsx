import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicroLabel, PebbleCard } from "./pebble";

// Hero stat card: date, big reading, caption, dual actions.
export function ClimateHero() {
  return (
    <PebbleCard className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div>
          <MicroLabel>Friday 03</MicroLabel>
          <span className="mt-1.5 inline-block rounded-md bg-black/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] dark:bg-white/10">
            April 2026
          </span>
        </div>
        <Cloud className="size-5 text-muted-foreground" />
      </div>

      <div className="mt-6 flex items-end justify-between">
        <p className="text-6xl font-medium tracking-tight tabular-nums">
          19<span className="align-top text-2xl">°C</span>
        </p>
        <p className="pb-1 text-3xl font-medium tabular-nums">
          04:31
          <span className="ml-1 text-sm font-semibold text-muted-foreground">
            PM
          </span>
        </p>
      </div>

      <div className="mt-8">
        <p className="text-sm font-bold tracking-wide">REAL-TIME CLIMATE</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Monitor temperature, humidity, and air quality in real time — all in
          one place.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          className="h-11 rounded-full bg-black/[0.06] font-semibold text-foreground hover:bg-black/10 dark:bg-white/10"
        >
          Skip
        </Button>
        <Button className="h-11 rounded-full bg-[#111111] font-semibold text-white hover:bg-black dark:bg-white dark:text-black">
          Continue
        </Button>
      </div>
    </PebbleCard>
  );
}
