"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

/* VOLTA slider: flat track, copper fill, square Bit thumb (18px). Hit area 44px via padding. */

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  style,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      style={{ borderRadius: "var(--radius)", ...style }}
      className={cn(
        "relative flex w-full touch-none items-center py-5 select-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1 w-full grow overflow-hidden bg-[var(--color-control)]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-[var(--color-accent)]"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={props["aria-label"] ?? props["aria-labelledby"] ?? "Nilai"}
        className="block size-[22px] shrink-0 cursor-pointer border-2 border-[var(--color-accent)] bg-[var(--color-surface)] transition-colors outline-none hover:bg-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:pointer-events-none"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
