import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type PaddingValue = "0" | "4" | "6" | "8"
const CardContext = React.createContext<{ padding: PaddingValue }>({ padding: "6" })

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg"
  shadow?: "none" | "sm" | "md"
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = "md", shadow = "sm", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    
    const paddingValue: PaddingValue = {
      none: "0",
      sm: "4",
      md: "6",
      lg: "8",
    }[padding] as PaddingValue

    const contextValue = React.useMemo(
      () => ({ padding: paddingValue }),
      [paddingValue]
    )

    return (
      <CardContext.Provider value={contextValue}>
        <Comp
          ref={ref}
          className={cn(
            "rounded-[--radius-lg] bg-[--color-surface] border border-[oklch(from_var(--color-text)_l_c_h_/_0.08)] transition-shadow",
            shadow === "sm" && "shadow-[--shadow-sm]",
            shadow === "md" && "shadow-[--shadow-md]",
            className
          )}
          {...props}
        />
      </CardContext.Provider>
    )
  }
)
Card.displayName = "Card"

const pxClasses: Record<PaddingValue, string> = {
  "0": "px-0",
  "4": "px-4",
  "6": "px-6",
  "8": "px-8",
}

const ptClasses: Record<PaddingValue, string> = {
  "0": "pt-0",
  "4": "pt-4",
  "6": "pt-6",
  "8": "pt-8",
}

const pbClasses: Record<PaddingValue, string> = {
  "0": "pb-0",
  "4": "pb-4",
  "6": "pb-6",
  "8": "pb-8",
}

const pClasses: Record<PaddingValue, string> = {
  "0": "p-0",
  "4": "p-4",
  "6": "p-6",
  "8": "p-8",
}

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { padding } = React.useContext(CardContext)
    return (
      <div
        ref={ref}
        className={cn(
          "font-semibold text-[var(--text-lg)]",
          pxClasses[padding],
          ptClasses[padding],
          "pb-0",
          className
        )}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { padding } = React.useContext(CardContext)
    return (
      <div
        ref={ref}
        className={cn(
          "text-[var(--text-base)] text-[--color-text]",
          pClasses[padding],
          className
        )}
        {...props}
      />
    )
  }
)
CardBody.displayName = "CardBody"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { padding } = React.useContext(CardContext)
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2",
          pxClasses[padding],
          pbClasses[padding],
          "pt-0",
          className
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardBody, CardFooter }
