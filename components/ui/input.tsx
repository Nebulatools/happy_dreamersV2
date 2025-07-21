import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Para inputs datetime-local, asegurarse que value siempre sea string
    const inputProps = {...props};
    
    // Si es un datetime-local y value es undefined/null, usar string vacío
    if (type === "datetime-local" && inputProps.value === undefined) {
      inputProps.value = "";
    }
    
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-bg-input px-4 py-3 text-base text-hd-primary placeholder:text-hd-placeholder file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:border-input-focused focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 md:text-base",
          className
        )}
        ref={ref}
        {...inputProps}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
