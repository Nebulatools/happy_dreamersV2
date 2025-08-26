// Registro y gestión del Service Worker

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  // Verificar si el navegador soporta Service Workers
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  // Registrar el Service Worker
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.log('Service Workers no soportados en este navegador')
      return null
    }

    try {
      // Registrar el service worker
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })

      console.log('Service Worker registrado:', this.registration)

      // Esperar a que esté listo
      await navigator.serviceWorker.ready

      // Actualizar si hay una nueva versión
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nuevo service worker disponible
              this.notifyUpdateAvailable()
            }
          })
        }
      })

      return this.registration
    } catch (error) {
      console.error('Error registrando Service Worker:', error)
      return null
    }
  }

  // Desregistrar el Service Worker
  async unregister(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const success = await this.registration.unregister()
      if (success) {
        this.registration = null
        this.subscription = null
      }
      return success
    } catch (error) {
      console.error('Error desregistrando Service Worker:', error)
      return false
    }
  }

  // Solicitar permisos de notificación
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('Este navegador no soporta notificaciones')
      return 'denied'
    }

    // Si ya tenemos permiso, retornar
    if (Notification.permission === 'granted') {
      return 'granted'
    }

    // Si fue denegado, no podemos volver a preguntar
    if (Notification.permission === 'denied') {
      console.warn('Los permisos de notificación fueron denegados previamente')
      return 'denied'
    }

    // Solicitar permiso
    try {
      const permission = await Notification.requestPermission()
      console.log('Permiso de notificación:', permission)
      return permission
    } catch (error) {
      console.error('Error solicitando permisos:', error)
      return 'denied'
    }
  }

  // Suscribirse a push notifications
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionData | null> {
    if (!this.registration) {
      console.error('Service Worker no registrado')
      return null
    }

    // Verificar permisos
    const permission = await this.requestNotificationPermission()
    if (permission !== 'granted') {
      console.error('Permisos de notificación no otorgados')
      return null
    }

    try {
      // Convertir VAPID key a Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey)

      // Suscribirse a push
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('Push subscription creada:', this.subscription)

      // Convertir a formato JSON
      const subscriptionData: PushSubscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth'))
        }
      }

      // Enviar suscripción al servidor
      await this.sendSubscriptionToServer(subscriptionData)

      return subscriptionData
    } catch (error) {
      console.error('Error suscribiendo a push:', error)
      return null
    }
  }

  // Desuscribirse de push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription) {
      console.log('No hay suscripción activa')
      return true
    }

    try {
      const success = await this.subscription.unsubscribe()
      if (success) {
        this.subscription = null
        // Notificar al servidor
        await this.removeSubscriptionFromServer()
      }
      return success
    } catch (error) {
      console.error('Error desuscribiendo de push:', error)
      return false
    }
  }

  // Obtener suscripción actual
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null

    try {
      this.subscription = await this.registration.pushManager.getSubscription()
      return this.subscription
    } catch (error) {
      console.error('Error obteniendo suscripción:', error)
      return null
    }
  }

  // Enviar mensaje de prueba
  async sendTestNotification(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker no activo')
    }

    // Enviar mensaje al service worker
    this.registration.active.postMessage({
      type: 'TEST_NOTIFICATION'
    })
  }

  // Enviar suscripción al servidor
  private async sendSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      })

      if (!response.ok) {
        throw new Error('Error enviando suscripción al servidor')
      }

      console.log('Suscripción enviada al servidor')
    } catch (error) {
      console.error('Error enviando suscripción:', error)
      throw error
    }
  }

  // Remover suscripción del servidor
  private async removeSubscriptionFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error removiendo suscripción del servidor')
      }

      console.log('Suscripción removida del servidor')
    } catch (error) {
      console.error('Error removiendo suscripción:', error)
    }
  }

  // Notificar que hay una actualización disponible
  private notifyUpdateAvailable(): void {
    // Aquí podrías mostrar un toast o banner al usuario
    console.log('Nueva versión del Service Worker disponible')
    
    // Enviar evento personalizado
    window.dispatchEvent(new CustomEvent('sw-update-available'))
  }

  // Utilidades para conversión de datos
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // Verificar estado del Service Worker
  getStatus(): {
    supported: boolean
    registered: boolean
    permission: NotificationPermission
    subscribed: boolean
  } {
    return {
      supported: this.isSupported(),
      registered: !!this.registration,
      permission: 'Notification' in window ? Notification.permission : 'denied',
      subscribed: !!this.subscription
    }
  }
}

// Exportar instancia singleton
export const swManager = ServiceWorkerManager.getInstance()