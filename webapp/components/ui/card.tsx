import * as React from "react"
import { cn } from "cn"

/* VOLTA app card (DESIGN-APP.md §5): radius 8px, flat surface + 1px border
   + satu bayangan lembut. Varian lift hanya untuk kartu link. */

function Card({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      style={{ borderRadius: "var(--radius)", ...style }}
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/0.06)]",
        className
      )}
      {...props}
    />
  )
}

function CardLift({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-lift"
      style={{ borderRadius: "var(--radius)", ...style }}
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-muted)] hover:shadow-[0_6px_16px_rgb(0_0_0/0.08)] motion-reduce:transform-none motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

export { Card, CardLift }
