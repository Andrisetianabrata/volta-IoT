"use client";

import { useState } from "react";
import { Clock3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "./bits";
import { MicroLabel, PebbleCard } from "./pebble";

// Room picker + quick action row from the room-control reference.
export function RoomCard() {
  const [room, setRoom] = useState("living");

  return (
    <PebbleCard className="flex h-full flex-col">
      <MicroLabel>Room control</MicroLabel>
      <div className="mt-3">
        <SegmentedControl
          ariaLabel="Select room"
          value={room}
          onValueChange={setRoom}
          options={[
            { value: "bedroom", label: "Bedroom 1" },
            { value: "living", label: "Living room" },
          ]}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Watching:{" "}
        <span className="font-semibold text-foreground">
          {room === "living" ? "Living room" : "Bedroom 1"}
        </span>
      </p>

      <MicroLabel className="mt-6">Quick actions</MicroLabel>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-black/[0.04] px-4 text-[13px] font-medium dark:bg-white/[0.06]">
          <Clock3 className="size-4 text-muted-foreground" />
          Set automatic schedule
        </div>
        <Button
          size="icon"
          aria-label="Add quick action"
          className="size-11 shrink-0 rounded-full bg-[#111111] text-white hover:bg-black dark:bg-white dark:text-black"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </PebbleCard>
  );
}
