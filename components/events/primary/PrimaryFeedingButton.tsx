"use client"

import React, { useState } from "react"
import { Utensils, Baby, Coffee, Apple } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FeedingModal } from "../FeedingModal"
import { cn } from "@/lib/utils"

interface PrimaryFeedingButtonProps {
  childId: string
  childName: string
  onEventRegistered?: () => void
  className?: string
}

/**
 * Botón primario de alimentación para el modo simple
 * Proporciona acceso rápido al registro de alimentación como evento principal
 */
export function PrimaryFeedingButton({
  childId,
  childName,
  onEventRegistered,
  className
}: PrimaryFeedingButtonProps) {
  const [showFeedingModal, setShowFeedingModal] = useState(false)

  return (
    <>
      {/* Botón principal de alimentación */}
      <Button
        onClick={() => setShowFeedingModal(true)}
        className={cn(
          "w-full h-20 text-lg font-bold text-white shadow-lg",
          "transform transition-all duration-200 hover:scale-[1.02]",
          "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
          className
        )}
      >
        <Utensils className="w-6 h-6 mr-2" />
        ALIMENTACIÓN
      </Button>

      {/* Modal de alimentación */}
      <FeedingModal
        isOpen={showFeedingModal}
        onClose={() => setShowFeedingModal(false)}
        childId={childId}
        childName={childName}
        onEventRegistered={() => {
          setShowFeedingModal(false)
          onEventRegistered?.()
        }}
      />
    </>
  )
}