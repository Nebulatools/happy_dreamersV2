"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Eliminación",
  description,
  itemName,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const defaultDescription = itemName 
    ? `¿Estás seguro de que quieres eliminar "${itemName}"?`
    : "¿Estás seguro de que quieres eliminar este elemento?"

  if (!mounted) return null

  const modal = (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md fixed z-[9999]">
        <DialogHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center space-y-3">
            <span className="block text-gray-700">
              {description || defaultDescription}
            </span>
            <span className="block text-red-500 text-sm">
              Esta acción no se puede deshacer.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="min-w-[120px]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-w-[120px]"
          >
            {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return createPortal(modal, document.body)
}