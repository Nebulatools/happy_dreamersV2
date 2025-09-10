"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface EventFormSectionProps {
  title: string
  className?: string
  children?: React.ReactNode
}

export function EventFormSection({ title, className, children }: EventFormSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-lg border bg-card p-4">
        {children}
      </div>
    </section>
  )
}

export default EventFormSection

