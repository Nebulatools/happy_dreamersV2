"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MessageCircle } from "lucide-react"

interface EventNotesModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (emotionalState: string, notes: string) => Promise<void> | void
  title: string
  description?: string
  defaultEmotion?: string
  defaultNotes?: string
  confirmLabel?: string
}

/**
 * Modal compacto para capturar estado emocional y notas rápidas
 * Reutilizable para despertares y cierres de eventos sin sleepDelay
 */
export function EventNotesModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  defaultEmotion = "tranquilo",
  defaultNotes = "",
  confirmLabel = "Guardar"
}: EventNotesModalProps) {
  const [emotionalState, setEmotionalState] = useState(defaultEmotion)
  const [notes, setNotes] = useState(defaultNotes)
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset valores cada vez que se abre
  useEffect(() => {
    if (open) {
      setEmotionalState(defaultEmotion || "tranquilo")
      setNotes(defaultNotes || "")
    }
  }, [open, defaultEmotion, defaultNotes])

  const handleConfirm = async () => {
    setIsProcessing(true)
    await onConfirm(emotionalState, notes)
    setIsProcessing(false)
  }

  const emotionalStates = [
    { value: "tranquilo", label: "Tranquilo", helper: "Calmado" },
    { value: "inquieto", label: "Inquieto", helper: "Algo alterado" },
    { value: "alterado", label: "Alterado", helper: "Muy molesto" }
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estado emocional</Label>
            <div className="grid grid-cols-3 gap-2">
              {emotionalStates.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setEmotionalState(option.value)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-left",
                    emotionalState === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "font-semibold text-sm",
                      emotionalState === option.value ? "text-blue-700" : "text-gray-800"
                    )}
                  >
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">{option.helper}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega contexto breve sobre cómo se siente o qué pasó"
              rows={3}
              maxLength={300}
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500">
              Estas notas se guardarán junto con el evento.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Guardando..." : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
