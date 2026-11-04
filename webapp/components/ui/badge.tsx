import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/* VOLTA badge: functional status pill only (dot + label). Two shapes: status dot or square tag. */

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-2 text-[13px] font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        live: "text-[var(--color-text)]",
        stale: "text-[var(--color-muted)]",
        accent: "bg-[var(--color-accent)] text-[#111111] px-2 py-1",
        neutral: "border border-[var(--color-border)] text-[var(--color-muted)] px-2 py-1",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
)

function Badge({
  className,
  variant = "neutral",
  dot,
  style,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Show a status dot before the label. Pass a color or true for accent. */
    dot?: string | true
  }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      style={{ borderRadius: "var(--radius)", ...style }}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="inline-block size-2 rounded-full"
          style={{ background: dot === true ? "var(--color-accent)" : dot }}
        />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
