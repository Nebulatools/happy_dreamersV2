# Guía de Configuración de Notificaciones en Producción

## 📋 Checklist de Configuración

### 1. Generar VAPID Keys (Web Push)
```bash
# Instalar web-push globalmente
npm install -g web-push

# Generar keys
web-push generate-vapid-keys

# Guardar las keys generadas:
# Public Key: NEXT_PUBLIC_VAPID_PUBLIC_KEY
# Private Key: VAPID_PRIVATE_KEY
```

### 2. Configurar Variables en Vercel

En el dashboard de Vercel, agregar las siguientes variables de entorno:

#### Obligatorias:
- `MONGODB_URI` - URI de MongoDB Atlas
- `NEXTAUTH_URL` - https://tu-dominio.vercel.app
- `NEXTAUTH_SECRET` - Secret key para NextAuth
- `CRON_SECRET` - Secret para autenticar cron jobs

#### Para Notificaciones Push:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public key de VAPID
- `VAPID_PRIVATE_KEY` - Private key de VAPID
- `VAPID_SUBJECT` - mailto:admin@tudominio.com

#### Para Email (Opcional):
- `SENDGRID_API_KEY` - API key de SendGrid
- `EMAIL_FROM` - Email de origen verificado
- `EMAIL_REPLY_TO` - Email de respuesta

### 3. Verificar Service Worker

El Service Worker se registrará automáticamente en producción. Para verificar:

1. Abrir Chrome DevTools
2. Ir a Application → Service Workers
3. Verificar que `/service-worker.js` esté activo
4. Probar notificación con el botón "Push" en DevTools

### 4. Configurar Cron Jobs

#### Opción A: Vercel Cron (Recomendado)
Ya configurado en `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/notifications/scheduler",
    "schedule": "* * * * *"  // Cada minuto
  }]
}
```

#### Opción B: Servicio Externo
Si prefieres un servicio externo:

1. **Upstash** (Gratis hasta 10K requests)
   - Crear cuenta en upstash.com
   - Configurar QStash
   - URL: https://tu-app.vercel.app/api/notifications/scheduler
   - Headers: `Authorization: Bearer ${CRON_SECRET}`

2. **cron-job.org** (Gratis)
   - Crear cuenta
   - Nueva tarea cada minuto
   - URL y autenticación igual que arriba

### 5. Probar en Producción

#### Test Manual del Scheduler:
```bash
curl https://tu-app.vercel.app/api/notifications/scheduler \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Verificar Logs:
1. Ir a Vercel Dashboard
2. Functions → Ver logs de `/api/notifications/scheduler`
3. Verificar ejecución cada minuto

### 6. Monitoreo

#### Métricas a Monitorear:
- Tasa de entrega de notificaciones
- Errores en el scheduler
- Tiempo de respuesta del cron
- Usuarios con notificaciones activas

#### Herramientas Recomendadas:
- **Sentry** para errores
- **Mixpanel** para analytics
- **Vercel Analytics** para performance

## 🚨 Troubleshooting

### Problema: Service Worker no se registra
**Solución:**
- Verificar HTTPS (obligatorio)
- Limpiar cache del navegador
- Verificar consola por errores

### Problema: Notificaciones no llegan
**Solución:**
- Verificar permisos del navegador
- Revisar logs del scheduler
- Confirmar VAPID keys correctas
- Verificar que el cron esté ejecutándose

### Problema: Cron no se ejecuta
**Solución:**
- Verificar CRON_SECRET en Vercel
- Revisar límites del plan de Vercel
- Verificar logs de Functions

### Problema: Push notifications en iOS
**Nota:** iOS Safari requiere que la app sea instalada como PWA para recibir push notifications (iOS 16.4+)

## 📊 Límites y Costos

### Plan Gratuito de Vercel:
- Cron jobs: Máximo 2
- Ejecuciones: Sin límite
- Function duration: 10 segundos max

### Para escalar:
- Vercel Pro: $20/mes (más cron jobs, mayor duración)
- Redis Queue: Upstash $10/mes
- SendGrid: 100 emails/día gratis, luego $15/mes

## 🔒 Seguridad

### Recomendaciones:
1. Nunca exponer VAPID_PRIVATE_KEY en el cliente
2. Usar CRON_SECRET fuerte (32+ caracteres)
3. Validar todos los inputs en el scheduler
4. Rate limiting en endpoints públicos
5. Logs sin información sensible

### Headers de Seguridad (ya configurados):
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

## 📱 PWA Installation

Para mejor experiencia de notificaciones, promover instalación como PWA:

```javascript
// Detectar si se puede instalar
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Mostrar botón de instalación
});

// Trigger instalación
async function installPWA() {
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User ${outcome} the installation`);
  deferredPrompt = null;
}
```

## ✅ Checklist Final

- [ ] VAPID keys generadas y configuradas
- [ ] Variables de entorno en Vercel
- [ ] Service Worker activo en producción
- [ ] Cron job ejecutándose cada minuto
- [ ] Permisos de notificación solicitados
- [ ] Logs verificados sin errores
- [ ] Test de notificación exitoso
- [ ] Monitoreo configurado
- [ ] Backup plan para fallos

## 📞 Soporte

Para problemas en producción:
1. Revisar logs en Vercel Dashboard
2. Verificar estado del Service Worker
3. Confirmar variables de entorno
4. Revisar esta documentación

---

*Última actualización: Enero 2025*