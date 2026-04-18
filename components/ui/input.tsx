import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, helperText, error, leftElement, rightElement, id: propsId, disabled, ...props }, ref) => {
    const generatedId = React.useId()
    const id = propsId || generatedId
    const helperId = `${id}-helper`
    const errorId = `${id}-error`
    const hasError = !!error

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={id}
            className={cn(
                  "text-sm font-medium leading-none text-[--color-text]",
                  disabled && "cursor-not-allowed opacity-70"
                )}
            >
              {label}
            </label>
        )}
        <div
          className={cn(
            "flex h-10 w-full rounded-[--radius-md] border border-[--color-border] bg-[--color-surface] px-3 py-2 text-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[--color-text-muted] focus-within:ring-2 focus-within:ring-[--color-primary] focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
            hasError && "border-[--color-error] focus-within:ring-[--color-error]",
            className
          )}
        >
          {leftElement && (
            <div className="mr-2 flex items-center text-[--color-text-muted]">
              {leftElement}
            </div>
          )}
          <input
            id={id}
            type={type}
            className="flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={cn(
              !hasError && helperText && helperId,
              hasError && errorId
            )}
            {...props}
          />
          {rightElement && (
            <div className="ml-2 flex items-center text-[--color-text-muted]">
              {rightElement}
            </div>
          )}
        </div>
        {hasError && (
          <p id={errorId} className="text-xs font-medium text-[--color-error]">
            {error}
          </p>
        )}
        {!hasError && helperText && (
          <p id={helperId} className="text-xs text-[--color-text-muted]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
