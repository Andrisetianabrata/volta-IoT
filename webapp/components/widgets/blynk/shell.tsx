import type { ReactNode } from "react";
import { MicroLabel, PebbleCard } from "../pebble";
import { StatusChip } from "../bits";
import { cn } from "@/lib/utils";

// Card header shared by the Blynk Legacy set: widget name + virtual pin.
// Segel Checkpoint C: tiap kartu galeri bertag PREVIEW agar nilai statis
// tak pernah dikira data device; kanvas produksi (W10) hanya baca API.
export function BlynkCard({
  name,
  pin,
  className,
  children,
}: {
  name: string;
  pin: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PebbleCard className={cn("flex h-full flex-col", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <MicroLabel>{name}</MicroLabel>
        <span className="flex items-center gap-1.5">
          <StatusChip>Preview</StatusChip>
          <span className="rounded-md bg-black/[0.07] px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider tabular-nums dark:bg-white/10">
            {pin}
          </span>
        </span>
      </div>
      {children}
    </PebbleCard>
  );
}
