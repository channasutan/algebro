import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" && 
            "bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)]",
          variant === "secondary" && 
            "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]",
          variant === "ghost" && 
            "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]",
          size === "sm" && "h-9 px-3 text-sm",
          size === "md" && "h-11 px-4 text-base",
          size === "lg" && "h-12 px-6 text-lg",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
