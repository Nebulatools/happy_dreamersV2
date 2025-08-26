// Service Worker para Happy Dreamers
// Maneja push notifications, caching y funcionalidad offline

const CACHE_NAME = 'happy-dreamers-v1'
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto')
        return cache.addAll(urlsToCache)
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Interceptar peticiones y servir desde cache cuando sea posible
self.addEventListener('fetch', event => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar desde cache si existe
        if (response) {
          return response
        }

        // Sino, hacer la petición a la red
        return fetch(event.request).then(response => {
          // No cachear respuestas no exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clonar la respuesta para el cache
          const responseToCache = response.clone()

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache)
            })

          return response
        })
      })
      .catch(() => {
        // Si falla la red, mostrar página offline si existe
        return caches.match('/offline.html')
      })
  )
})

// Manejar Push Notifications
self.addEventListener('push', event => {
  console.log('Push notification recibida:', event)

  if (!event.data) {
    console.log('Push sin datos')
    return
  }

  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    data = {
      title: 'Happy Dreamers',
      body: event.data.text()
    }
  }

  const options = {
    body: data.body || 'Nueva notificación de Happy Dreamers',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/dashboard/notificaciones',
      childId: data.childId,
      type: data.type
    },
    actions: [
      {
        action: 'view',
        title: 'Ver',
        icon: '/icons/check.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/close.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Happy Dreamers', options)
  )
})

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Click en notificación:', event)
  event.notification.close()

  const urlToOpen = event.notification.data.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Buscar si ya hay una ventana abierta
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Sincronización en background (para reintentar notificaciones fallidas)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  try {
    // Obtener notificaciones pendientes del IndexedDB o localStorage
    const response = await fetch('/api/notifications/pending', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (response.ok) {
      const pendingNotifications = await response.json()
      console.log('Sincronizando notificaciones pendientes:', pendingNotifications.length)
      
      // Procesar notificaciones pendientes
      for (const notification of pendingNotifications) {
        await self.registration.showNotification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          data: notification
        })
      }
    }
  } catch (error) {
    console.error('Error sincronizando notificaciones:', error)
  }
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  console.log('Mensaje recibido en SW:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('Prueba de Notificación', {
      body: 'Las notificaciones están funcionando correctamente',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200]
    })
  }
})