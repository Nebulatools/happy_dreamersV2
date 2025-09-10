"use client"

import React, { useState } from 'react'
import { MedicationModal } from './MedicationModal'
import { FeedingModal } from './FeedingModal'
import { ExtraActivityModal } from './ExtraActivityModal'
import { SleepDelayModal } from './SleepDelayModal'
import { NightWakingModal } from './NightWakingModal'
import { ManualEventModal } from './ManualEventModal'
import { useToast } from '@/hooks/use-toast'
import { FeedingModalData } from './types'

interface Event {
  _id: string
  childId: string
  eventType: string
  emotionalState?: string
  startTime: string
  endTime?: string
  notes?: string
  // Campos específicos de medicamento
  medicationName?: string
  medicationDose?: string
  medicationTime?: string
  medicationNotes?: string
  // Campos específicos de alimentación
  feedingType?: 'breast' | 'bottle' | 'solids'
  feedingAmount?: number
  feedingDuration?: number
  babyState?: 'awake' | 'asleep'
  feedingNotes?: string
  // Campos específicos de actividad extra
  activityDescription?: string
  activityDuration?: number
  activityImpact?: 'positive' | 'neutral' | 'negative'
  activityNotes?: string
  // Campos específicos de sueño
  sleepDelay?: number
  // Campos específicos de despertar nocturno
  awakeDelay?: number
}

interface EventEditRouterProps {
  event: Event | null
  open: boolean
  onClose: () => void
  onUpdate: () => void
  childName: string
}

/**
 * Router que determina qué modal específico abrir para editar un evento
 * Reutiliza los modales de registro existentes en modo edición
 */
export function EventEditRouter({
  event,
  open,
  onClose,
  onUpdate,
  childName
}: EventEditRouterProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!event || !open) return null

  // Función para actualizar el evento en la base de datos
  const updateEvent = async (updatedData: any) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/children/events/${event._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedData,
          childId: event.childId,
          eventType: event.eventType
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el evento')
      }

      toast({
        title: "Evento actualizado",
        description: "Los cambios se han guardado correctamente"
      })

      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error al actualizar evento:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el evento",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Determinar qué modal mostrar según el tipo de evento
  switch (event.eventType) {
    case 'medication':
      return (
        <MedicationModal
          open={open}
          onClose={onClose}
          onConfirm={async (data) => {
            // Construir fecha/hora completa si se proporcionó
            let startTime = event.startTime
            if (data.medicationTime) {
              const date = new Date(event.startTime)
              const [hours, minutes] = data.medicationTime.split(':')
              date.setHours(parseInt(hours), parseInt(minutes))
              startTime = date.toISOString()
            }

            await updateEvent({
              ...data,
              startTime,
              notes: data.medicationNotes
            })
          }}
          childName={childName}
          mode="edit"
          initialData={{
            medicationName: event.medicationName,
            medicationDose: event.medicationDose,
            medicationTime: event.medicationTime,
            medicationNotes: event.medicationNotes || event.notes,
            startTime: event.startTime,
            eventId: event._id
          }}
        />
      )

    case 'feeding':
      // Utilidades de conversión
      const mlToOz = (ml?: number) => {
        if (!ml || isNaN(ml)) return 0
        return Math.round((ml / 29.5735))
      }
      return (
        <FeedingModal
          open={open}
          onClose={onClose}
          onConfirm={async (data: FeedingModalData) => {
            // Convertir oz → ml para biberón antes de actualizar
            const payload = { ...data }
            if (payload.feedingType === 'bottle' && typeof payload.feedingAmount === 'number') {
              payload.feedingAmount = Math.round(payload.feedingAmount * 29.5735)
            }
            await updateEvent({
              ...payload,
              startTime: event.startTime,
              notes: data.feedingNotes
            })
          }}
          childName={childName}
          mode="edit"
          initialData={{
            feedingType: event.feedingType,
            feedingAmount: event.feedingType === 'bottle' ? mlToOz(event.feedingAmount) : event.feedingAmount,
            feedingDuration: event.feedingDuration,
            babyState: event.babyState,
            feedingNotes: event.feedingNotes || event.notes,
            startTime: event.startTime,
            eventId: event._id
          }}
        />
      )

    case 'extra_activities':
      return (
        <ExtraActivityModal
          open={open}
          onClose={onClose}
          onConfirm={async (data) => {
            await updateEvent({
              ...data,
              startTime: event.startTime,
              notes: data.activityNotes
            })
          }}
          childName={childName}
          mode="edit"
          initialData={{
            activityDescription: event.activityDescription,
            activityDuration: event.activityDuration,
            activityImpact: event.activityImpact,
            activityNotes: event.activityNotes || event.notes,
            startTime: event.startTime,
            eventId: event._id
          }}
        />
      )

    case 'sleep':
    case 'nap':
      return (
        <SleepDelayModal
          open={open}
          onClose={onClose}
          onConfirm={async (delay, emotionalState, notes) => {
            await updateEvent({
              sleepDelay: delay,
              emotionalState,
              notes,
              startTime: event.startTime,
              endTime: event.endTime
            })
          }}
          childName={childName}
          eventType={event.eventType as 'sleep' | 'nap'}
          mode="edit"
          initialData={{
            sleepDelay: event.sleepDelay,
            emotionalState: event.emotionalState,
            notes: event.notes,
            startTime: event.startTime,
            eventId: event._id
          }}
        />
      )

    case 'night_waking':
      return (
        <NightWakingModal
          open={open}
          onClose={onClose}
          onConfirm={async (awakeDelay, emotionalState, notes) => {
            await updateEvent({
              awakeDelay,
              emotionalState,
              notes,
              startTime: event.startTime,
              endTime: event.endTime
            })
          }}
          childName={childName}
          childId={event.childId}
          mode="edit"
          initialData={{
            awakeDelay: event.awakeDelay,
            emotionalState: event.emotionalState,
            notes: event.notes,
            startTime: event.startTime,
            eventId: event._id
          }}
        />
      )

    case 'wake':
    case 'bedtime':
    default:
      // Para eventos simples o no soportados, usar ManualEventModal
      return (
        <ManualEventModal
          open={open}
          onClose={onClose}
          childId={event.childId}
          childName={childName}
          onEventRegistered={onUpdate}
        />
      )
  }
}
