import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hd-gradient-primary text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-border bg-white hover:bg-accent hover:shadow-md text-hd-label rounded-xl hover:scale-[1.01] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl hover:shadow-md hover:scale-[1.01] active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-lg hover:scale-[1.01] active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-14 px-8 py-4 text-base rounded-xl",
        icon: "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
