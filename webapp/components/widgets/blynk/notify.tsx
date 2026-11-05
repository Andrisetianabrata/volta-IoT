"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { StatusChip } from "../bits";
import { BlynkCard } from "./shell";

// Push notification rule preview.
export function PushWidget() {
  const [on, setOn] = useState(true);
  return (
    <BlynkCard name="Notification · push" pin="alarm">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-black/[0.06] dark:bg-white/10">
          <BellRing className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">Tank low</p>
          <p className="text-xs text-muted-foreground">Level &lt; 2 for 5 min</p>
        </div>
        <Switch checked={on} onCheckedChange={setOn} aria-label="Push rule enabled" />
      </div>
      <div className="mt-3 rounded-2xl bg-black/[0.04] p-3 text-[13px] dark:bg-white/[0.06]">
        “Water tank is almost empty. Pump stopped.”
      </div>
      <div className="mt-3">
        <StatusChip tone={on ? "copper" : "paper"}>{on ? "Armed" : "Muted"}</StatusChip>
      </div>
    </BlynkCard>
  );
}
