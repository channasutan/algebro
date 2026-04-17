import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
        variant === "default" &&
          "bg-[var(--color-primary-highlight)] text-[var(--color-primary)]",
        variant === "secondary" &&
          "bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border border-[var(--color-border)]",
        variant === "success" &&
          "bg-[var(--color-success-highlight)] text-[var(--color-success)]",
        variant === "warning" &&
          "bg-[var(--color-warning-highlight)] text-[var(--color-warning)]",
        variant === "error" &&
          "bg-[var(--color-error-highlight)] text-[var(--color-error)]",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
