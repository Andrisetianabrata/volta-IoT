import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/* VOLTA app button (DESIGN-APP.md §5): flat, radius 8px, one fill per variant. No gradients, no glow. */

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border text-[15px] font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary)] text-[var(--primary-foreground)] hover:opacity-85",
        accent: "border-transparent bg-[var(--color-accent)] text-[var(--accent-foreground)] hover:opacity-90",
        outline: "border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-accent)]",
        ghost: "border-transparent bg-transparent text-[var(--color-text)] hover:bg-[var(--color-raised)]",
        destructive: "border-transparent bg-[#C4242A] text-white hover:opacity-90 dark:bg-[#E5566F] dark:text-[#101012]",
      },
      size: {
        default: "min-h-[44px] px-4",
        sm: "min-h-[40px] px-3 text-sm",
        lg: "min-h-[52px] px-6 text-base",
        icon: "size-[44px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ borderRadius: "var(--radius)", ...style }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
