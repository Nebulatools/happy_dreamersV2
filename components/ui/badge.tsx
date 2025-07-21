import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Nuevos badges personalizados para Happy Dreamers
        good: "border-transparent bg-[#E6F9EF] text-[#22B07D] hover:bg-[#E6F9EF]/80",
        consistent: "border-transparent bg-[#D4C1FF] text-[#8666D2] hover:bg-[#D4C1FF]/80",
        average: "border-transparent bg-[#FFF6E6] text-[#E5A43B] hover:bg-[#FFF6E6]/80",
        poor: "border-transparent bg-[#FFC4C4] text-[#EC6A6A] hover:bg-[#FFC4C4]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
