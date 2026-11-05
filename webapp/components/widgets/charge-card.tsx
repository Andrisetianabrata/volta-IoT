import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ControlRow } from "./bits";
import { MicroLabel, PebbleCard } from "./pebble";

// Energy card: charge percent, progress bar, range/power stats.
export function ChargeCard() {
  return (
    <PebbleCard className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-bold">Charging</p>
          <p className="text-xs text-muted-foreground">Fast charging</p>
        </div>
        <p className="text-xl font-bold text-[#8a5a1c] tabular-nums dark:text-[#e0a75e]">
          72%
        </p>
      </div>

      <Progress
        value={72}
        aria-label="Battery charge 72 percent"
        className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-black/[0.08] [&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:bg-[#C07A24] dark:[&_[data-slot=progress-track]]:bg-white/10"
      />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Zap className="size-3.5 fill-[#C07A24] text-[#C07A24]" />
        20 min remaining to charge limit
      </p>

      <Separator className="my-4 bg-black/[0.06] dark:bg-white/10" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <MicroLabel>Range</MicroLabel>
          <p className="mt-0.5 text-lg font-bold tabular-nums">268 km</p>
        </div>
        <div>
          <MicroLabel>Power</MicroLabel>
          <p className="mt-0.5 text-lg font-bold tabular-nums">42 kW</p>
        </div>
      </div>

      <div className="mt-2 border-t border-black/[0.06] dark:border-white/10">
        <ControlRow label="Charge limit" value="80%" />
      </div>
    </PebbleCard>
  );
}
