"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText } from "lucide-react"
import { useDevTime } from "@/context/dev-time-context"
import { useUser } from "@/context/UserContext"
import { format } from "date-fns"
import { buildLocalDate, dateToTimestamp, DEFAULT_TIMEZONE } from "@/lib/datetime"
import { NoteModalData, EditOptions } from "./types"

interface NoteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (data: NoteModalData, editOptions?: EditOptions) => void | Promise<void>
  childName: string
  mode?: "create" | "edit"
  initialData?: {
    noteText?: string
    notes?: string  // Campo legacy para compatibilidad
    startTime?: string
    eventId?: string
  }
}

/**
 * Modal para capturar notas de bitacora
 * Registra texto de nota con fecha/hora
 */
export function NoteModal({
  open,
  onClose,
  onConfirm,
  childName,
  mode = "create",
  initialData,
}: NoteModalProps) {
  const { getCurrentTime } = useDevTime()
  const { userData } = useUser()
  const timezone = userData?.timezone || DEFAULT_TIMEZONE

  // El contenido puede venir de noteText o notes (compatibilidad)
  const initialNoteContent = initialData?.noteText || initialData?.notes || ""

  const [noteText, setNoteText] = useState<string>(initialNoteContent)
  const [eventDate, setEventDate] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "yyyy-MM-dd")
    }
    return format(getCurrentTime(), "yyyy-MM-dd")
  })
  const [eventTime, setEventTime] = useState<string>(() => {
    if (mode === "edit" && initialData?.startTime) {
      return format(new Date(initialData.startTime), "HH:mm")
    }
    return format(getCurrentTime(), "HH:mm")
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // Actualizar la hora cada vez que se abre el modal (solo en modo create)
  useEffect(() => {
    if (open && mode === "create") {
      const now = getCurrentTime()
      setEventTime(format(now, "HH:mm"))
      setEventDate(format(now, "yyyy-MM-dd"))
    }
  }, [open, getCurrentTime, mode])

  // Inicializar con datos cuando se abre en modo edicion
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setNoteText(initialData.noteText || initialData.notes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setEventTime(format(new Date(initialData.startTime), "HH:mm"))
      }
    }
  }, [open, mode, initialData])

  // Reset del formulario
  const resetForm = () => {
    if (mode === "edit" && initialData) {
      // En modo edicion, restaurar valores iniciales
      setNoteText(initialData.noteText || initialData.notes || "")
      if (initialData.startTime) {
        setEventDate(format(new Date(initialData.startTime), "yyyy-MM-dd"))
        setEventTime(format(new Date(initialData.startTime), "HH:mm"))
      }
    } else {
      // En modo creacion, limpiar todo
      setNoteText("")
      const now = getCurrentTime()
      setEventTime(format(now, "HH:mm"))
      setEventDate(format(now, "yyyy-MM-dd"))
    }
  }

  // Manejar cierre del modal
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Manejar confirmacion
  const handleConfirm = async () => {
    // Validacion basica
    if (!noteText.trim()) {
      return // No hacer nada si no hay texto
    }

    setIsProcessing(true)

    const data: NoteModalData = {
      noteText: noteText.trim(),
    }

    // Construir editOptions para modo edicion
    let editOptions: EditOptions | undefined
    if (mode === "edit" && eventDate && eventTime) {
      const dateObj = buildLocalDate(eventDate, eventTime)
      editOptions = {
        startTime: dateToTimestamp(dateObj, timezone),
      }
    }

    await onConfirm(data, editOptions)
    setIsProcessing(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            {mode === "edit" ? "Editar Nota" : "Nueva Nota"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? `Modifica la nota de ${childName}`
              : `Agrega una nota a la bitacora de ${childName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contenido de la nota */}
          <div className="space-y-2">
            <Label htmlFor="note-text">
              Nota *
            </Label>
            <Textarea
              id="note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe tu nota aqui..."
              className="w-full min-h-[120px]"
              autoFocus
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 text-right">
              {noteText.length}/1000
            </p>
          </div>

          {/* Fecha y hora - Solo visible en modo edicion */}
          {mode === "edit" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="note-date">
                  Fecha
                </Label>
                <Input
                  id="note-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note-time">
                  Hora
                </Label>
                <Input
                  id="note-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Indicacion de campos requeridos */}
          <p className="text-xs text-gray-500">
            * Campo requerido
          </p>
        </div>

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !noteText.trim()}
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
          >
            {isProcessing
              ? (mode === "edit" ? "Guardando..." : "Agregando...")
              : (mode === "edit" ? "Guardar Cambios" : "Agregar Nota")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
