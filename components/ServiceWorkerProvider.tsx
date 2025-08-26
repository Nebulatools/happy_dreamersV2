"use client"

// Proveedor para registrar y gestionar el Service Worker

import { createContext, useContext, useEffect, useState } from 'react'
import { swManager } from '@/lib/service-worker-registration'
import { toast } from 'sonner'

interface ServiceWorkerContextValue {
  isSupported: boolean
  isRegistered: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  registerSW: () => Promise<void>
  subscribeToPush: () => Promise<void>
  unsubscribe: () => Promise<void>
  sendTestNotification: () => Promise<void>
}

const ServiceWorkerContext = createContext<ServiceWorkerContextValue>({
  isSupported: false,
  isRegistered: false,
  permission: 'default',
  isSubscribed: false,
  registerSW: async () => {},
  subscribeToPush: async () => {},
  unsubscribe: async () => {},
  sendTestNotification: async () => {}
})

export function useServiceWorker() {
  return useContext(ServiceWorkerContext)
}

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [status, setStatus] = useState({
    isSupported: false,
    isRegistered: false,
    permission: 'default' as NotificationPermission,
    isSubscribed: false
  })

  // Verificar estado inicial
  useEffect(() => {
    checkStatus()
    
    // Registrar automáticamente en producción
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker()
    }

    // Escuchar actualizaciones del SW
    window.addEventListener('sw-update-available', handleSWUpdate)
    
    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdate)
    }
  }, [])

  const checkStatus = async () => {
    const currentStatus = swManager.getStatus()
    setStatus({
      isSupported: currentStatus.supported,
      isRegistered: currentStatus.registered,
      permission: currentStatus.permission,
      isSubscribed: currentStatus.subscribed
    })

    // Verificar suscripción actual
    if (currentStatus.registered) {
      const subscription = await swManager.getCurrentSubscription()
      setStatus(prev => ({
        ...prev,
        isSubscribed: !!subscription
      }))
    }
  }

  const registerServiceWorker = async () => {
    try {
      const registration = await swManager.register()
      if (registration) {
        console.log('Service Worker registrado exitosamente')
        await checkStatus()
        
        // En desarrollo, mostrar notificación de éxito
        if (process.env.NODE_ENV === 'development') {
          toast.success('Service Worker registrado', {
            description: 'Las notificaciones push están listas'
          })
        }
      }
    } catch (error) {
      console.error('Error registrando Service Worker:', error)
      if (process.env.NODE_ENV === 'development') {
        toast.error('Error registrando Service Worker')
      }
    }
  }

  const subscribeToPush = async () => {
    try {
      // Obtener VAPID public key del servidor o variable de entorno
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key no configurada')
      }

      const subscription = await swManager.subscribeToPush(vapidPublicKey)
      
      if (subscription) {
        await checkStatus()
        toast.success('Notificaciones activadas', {
          description: 'Recibirás alertas de los horarios de sueño'
        })
      } else {
        toast.error('No se pudo activar las notificaciones', {
          description: 'Verifica los permisos del navegador'
        })
      }
    } catch (error) {
      console.error('Error suscribiendo a push:', error)
      toast.error('Error al activar notificaciones')
    }
  }

  const unsubscribe = async () => {
    try {
      const success = await swManager.unsubscribeFromPush()
      if (success) {
        await checkStatus()
        toast.success('Notificaciones desactivadas')
      }
    } catch (error) {
      console.error('Error desuscribiendo:', error)
      toast.error('Error al desactivar notificaciones')
    }
  }

  const sendTestNotification = async () => {
    try {
      await swManager.sendTestNotification()
      toast.success('Notificación de prueba enviada')
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error)
      toast.error('Error al enviar notificación de prueba')
    }
  }

  const handleSWUpdate = () => {
    toast.info('Nueva versión disponible', {
      description: 'Recarga la página para actualizar',
      action: {
        label: 'Recargar',
        onClick: () => window.location.reload()
      },
      duration: 10000
    })
  }

  const value: ServiceWorkerContextValue = {
    isSupported: status.isSupported,
    isRegistered: status.isRegistered,
    permission: status.permission,
    isSubscribed: status.isSubscribed,
    registerSW: registerServiceWorker,
    subscribeToPush,
    unsubscribe,
    sendTestNotification
  }

  return (
    <ServiceWorkerContext.Provider value={value}>
      {children}
    </ServiceWorkerContext.Provider>
  )
}