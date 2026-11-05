"use client";

import { useState } from "react";
import { ArrowLeftRight, Bluetooth, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusChip } from "../bits";
import { BlynkCard } from "./shell";

// Bridge: forward one pin to another device.
export function BridgeWidget() {
  return (
    <BlynkCard name="Bridge" pin="relay→pump">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>From device</Label>
          <Select defaultValue="esp32-01">
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="esp32-01">ESP32-01 · greenhouse</SelectItem>
              <SelectItem value="esp32-02">ESP32-02 · pump house</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowLeftRight className="size-4" /> forwards V23 into V10 on write
        </div>
        <div>
          <StatusChip tone="copper">Linked</StatusChip>
        </div>
      </div>
    </BlynkCard>
  );
}

// Webhook: push pin data to an external URL.
export function WebhookWidget() {
  const [state, setState] = useState("idle");
  return (
    <BlynkCard name="Webhook" pin="report">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-black/[0.06] dark:bg-white/10">
          <Globe className="size-5" />
        </span>
        <StatusChip>POST</StatusChip>
        <span className="font-mono text-xs text-muted-foreground">/api/v1/ingest</span>
      </div>
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="hook-url">Endpoint</Label>
        <Input
          id="hook-url"
          defaultValue="https://kebun.example.id/hook"
          inputMode="url"
          className="h-11 rounded-2xl font-mono text-xs"
        />
      </div>
      <Button
        variant="secondary"
        onClick={() => setState("sent 200 · 41 ms")}
        className="mt-3 h-10 w-full rounded-2xl bg-black/[0.06] font-semibold hover:bg-black/10 dark:bg-white/10"
      >
        {state === "idle" ? "Send test ping" : state}
      </Button>
    </BlynkCard>
  );
}

// Bluetooth / BLE: local commissioning link.
export function BleWidget() {
  const [scan, setScan] = useState(false);
  return (
    <BlynkCard name="Bluetooth · BLE" pin="local">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-black/[0.06] dark:bg-white/10">
          <Bluetooth className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold">Commissioning</p>
          <p className="text-xs text-muted-foreground">No internet needed</p>
        </div>
        <Switch checked={scan} onCheckedChange={setScan} aria-label="BLE scan" />
      </div>
      <div className="mt-3 rounded-2xl bg-black/[0.04] p-3 text-[13px] dark:bg-white/[0.06]">
        {scan ? (
          <p className="flex justify-between tabular-nums">
            <span className="font-semibold">VOLTA-01A4</span>
            <span className="text-muted-foreground">−58 dBm</span>
          </p>
        ) : (
          <p className="text-muted-foreground">Scan off — toggle to discover</p>
        )}
      </div>
    </BlynkCard>
  );
}
