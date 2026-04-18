import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[--color-surface-offset] text-[--color-text-muted]",
        success: "bg-[--color-success-highlight] text-[--color-success]",
        warning: "bg-[--color-warning-highlight] text-[--color-warning]",
        error: "bg-[--color-error-highlight] text-[--color-error]",
        info: "bg-[--color-blue-highlight] text-[--color-blue]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
