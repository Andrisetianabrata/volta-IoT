import { MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ControlRow, StatusChip } from "./bits";
import { MicroLabel, PebbleCard } from "./pebble";

// Range summary card: headline figure plus status rows.
export function RangeCard() {
  return (
    <PebbleCard className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-bold">Range</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            72% of battery remain
          </p>
        </div>
        <p className="text-xl font-bold text-[#8a5a1c] tabular-nums dark:text-[#e0a75e]">
          268 km
        </p>
      </div>

      <Separator className="my-4 bg-black/[0.06] dark:bg-white/10" />

      <div className="flex items-center justify-between py-1.5">
        <div>
          <MicroLabel>Status</MicroLabel>
          <p className="mt-0.5 text-sm font-bold">Parked</p>
        </div>
        <div className="text-right">
          <MicroLabel>Driving mode</MicroLabel>
          <p className="mt-0.5 text-sm font-bold">City</p>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        Garage — plugged in
      </div>

      <div className="mt-2 border-t border-black/[0.06] dark:border-white/10">
        <ControlRow label="Tire pressure" value="Normal" />
      </div>

      <div className="mt-1 flex gap-2">
        <StatusChip>Parked</StatusChip>
        <StatusChip tone="copper">Charging</StatusChip>
      </div>
    </PebbleCard>
  );
}
