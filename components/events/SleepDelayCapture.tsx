"use client"

import React, { useState, useEffect } from "react"
import { Moon, Clock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface SleepDelayCaptureProps {
  isOpen: boolean
  onClose: () => void
  bedtime: Date
  childName: string
  onConfirm: (sleepTime: Date, delay: number) => void
}

export function SleepDelayCapture({
  isOpen,
  onClose,
  bedtime,
  childName,
  onConfirm
}: SleepDelayCaptureProps) {
  const [selectedOption, setSelectedOption] = useState<'now' | 'still_awake' | 'custom'>('now')
  const [customMinutes, setCustomMinutes] = useState(5)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Actualizar el tiempo actual cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Actualizar cada minuto
    
    return () => clearInterval(interval)
  }, [])
  
  const minutesSinceBedtime = differenceInMinutes(currentTime, bedtime)
  
  // Opciones rápidas de tiempo
  const quickOptions = [0, 5, 10, 15, 30, 45]
  
  const handleConfirm = () => {
    const now = new Date()
    
    switch(selectedOption) {
      case 'now':
        // Se acaba de dormir ahora
        onConfirm(now, minutesSinceBedtime)
        break
      
      case 'still_awake':
        // Aún no se duerme, cerrar modal sin registrar
        onClose()
        break
      
      case 'custom':
        // Se durmió hace X minutos
        const sleepTime = new Date(bedtime.getTime() + customMinutes * 60000)
        onConfirm(sleepTime, customMinutes)
        break
    }
  }
  
  const handleQuickSelect = (minutes: number) => {
    if (minutes === 0) {
      // Se durmió inmediatamente
      onConfirm(bedtime, 0)
    } else {
      setCustomMinutes(minutes)
      setSelectedOption('custom')
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-600" />
            Registro de Sueño
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Información de la hora de acostarse */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">{childName}</span> se acostó a las{' '}
              <span className="font-bold">
                {format(bedtime, 'HH:mm', { locale: es })}
              </span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Hace {minutesSinceBedtime} minutos
            </p>
          </div>
          
          {/* Pregunta principal */}
          <div className="space-y-3">
            <p className="text-base font-medium text-gray-700">
              ¿Ya se durmió?
            </p>
            
            {/* Opciones principales */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedOption === 'now' ? 'default' : 'outline'}
                onClick={() => setSelectedOption('now')}
                className={cn(
                  "h-auto py-3 px-4",
                  selectedOption === 'now' && "bg-green-600 hover:bg-green-700"
                )}
              >
                <div className="text-center">
                  <Check className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Sí, ya duerme</span>
                  <span className="block text-xs opacity-80 mt-1">
                    Tardó {minutesSinceBedtime} min
                  </span>
                </div>
              </Button>
              
              <Button
                type="button"
                variant={selectedOption === 'still_awake' ? 'default' : 'outline'}
                onClick={() => setSelectedOption('still_awake')}
                className={cn(
                  "h-auto py-3 px-4",
                  selectedOption === 'still_awake' && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                <div className="text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Aún no</span>
                  <span className="block text-xs opacity-80 mt-1">
                    Registrar después
                  </span>
                </div>
              </Button>
            </div>
          </div>
          
          {/* Opciones rápidas de tiempo */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              O selecciona cuánto tardó:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {quickOptions.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={selectedOption === 'custom' && customMinutes === minutes ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickSelect(minutes)}
                  className={cn(
                    "text-xs",
                    selectedOption === 'custom' && customMinutes === minutes && 
                    "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  {minutes === 0 ? 'Inmediato' : `${minutes} min`}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Input personalizado */}
          {selectedOption === 'custom' && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">
                  Se durmió después de:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 px-2 py-1 text-center border rounded"
                    min="0"
                    max="120"
                  />
                  <span className="text-sm text-purple-700">minutos</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Resumen */}
          {selectedOption !== 'still_awake' && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Resumen:</span>{' '}
                {selectedOption === 'now' 
                  ? `Se durmió ahora (tardó ${minutesSinceBedtime} minutos)`
                  : selectedOption === 'custom' && customMinutes === 0
                  ? 'Se durmió inmediatamente'
                  : `Tardó ${customMinutes} minutos en dormirse`
                }
              </p>
            </div>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              "flex-1",
              selectedOption === 'still_awake' 
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {selectedOption === 'still_awake' ? 'Cerrar' : 'Confirmar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}